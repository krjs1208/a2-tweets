async function parseTweets(runkeeper_tweets) {
    if (!Array.isArray(runkeeper_tweets)) {
        window.alert('No tweets returned');
        return;
    }

    const tweets = runkeeper_tweets.map(tweet => new Tweet(tweet.text, tweet.created_at));
    const completed = tweets.filter(tweet => tweet.source === 'completed_event');
    const counts = new Map();
    completed.forEach(tweet => {
        const activity = tweet.activityType;
        if (activity !== 'unknown') {
            counts.set(activity, (counts.get(activity) || 0) + 1);
        }
    });
    const activityData = Array.from(counts, ([activity, count]) => ({ activity, count }))
        .sort((a, b) => b.count - a.count || a.activity.localeCompare(b.activity));
    const topActivities = activityData.slice(0, 3).map(entry => entry.activity);
    document.getElementById('numberActivities').textContent = activityData.length;
    ['firstMost', 'secondMost', 'thirdMost'].forEach((id, index) => {
        document.getElementById(id).textContent = topActivities[index] || 'none';
    });

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const distanceData = [];
    completed.forEach(tweet => {
        const activity = tweet.activityType;
        const distance = tweet.distance;
        // Duration-only workouts and unparsed distances cannot be distance observations.
        if (topActivities.includes(activity) && distance > 0 && Number.isFinite(distance) && !Number.isNaN(tweet.time.getTime())) {
            distanceData.push({ activity, distance, day: days[tweet.time.getUTCDay()], count: 1 });
        }
    });

    // Compute one mean for each activity/day pair for the alternate chart view.
    const groups = new Map();
    distanceData.forEach(record => {
        const key = record.activity + '/' + record.day;
        if (!groups.has(key)) {
            groups.set(key, { activity: record.activity, day: record.day, total: 0, count: 0 });
        }
        const group = groups.get(key);
        group.total += record.distance;
        group.count += 1;
    });
    const meanData = Array.from(groups.values(), group => ({
        activity: group.activity, day: group.day, distance: group.total / group.count, count: group.count
    }));

    const average = records => records.length ? records.reduce((sum, record) => sum + record.distance, 0) / records.length : 0;
    const activityMeans = topActivities.map(activity => {
        const records = distanceData.filter(record => record.activity === activity);
        return { activity, mean: average(records), count: records.length };
    }).filter(entry => entry.count > 0).sort((a, b) => b.mean - a.mean);
    document.getElementById('longestActivityType').textContent = activityMeans.length ? activityMeans[0].activity : 'unknown';
    document.getElementById('shortestActivityType').textContent = activityMeans.length ? activityMeans[activityMeans.length - 1].activity : 'unknown';
    const weekend = distanceData.filter(record => record.day === 'Saturday' || record.day === 'Sunday');
    const weekdays = distanceData.filter(record => record.day !== 'Saturday' && record.day !== 'Sunday');
    let longer = 'insufficient data';
    if (weekend.length && weekdays.length) {
        longer = average(weekend) > average(weekdays) ? 'weekends' : average(weekend) < average(weekdays) ? 'weekdays' : 'weekdays and weekends equally';
    }
    document.getElementById('weekdayOrWeekendLonger').textContent = longer;

    const activitySpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        description: 'Number of completed tweets for each parsed activity type.',
        data: { values: activityData },
        width: 'container',
        autosize: { type: 'fit-x', contains: 'padding', resize: true },
        height: Math.max(120, activityData.length * 22),
        mark: { type: 'bar', color: '#2864ad' },
        encoding: {
            x: { field: 'count', type: 'quantitative', title: 'Number of tweets', axis: { tickMinStep: 1 } },
            y: { field: 'activity', type: 'nominal', title: 'Activity type', sort: '-x' },
            tooltip: [{ field: 'activity', title: 'Activity' }, { field: 'count', title: 'Tweets', format: ',d' }]
        }
    };
    const distanceSpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        description: 'Distances of the three most common activities by day of the week (UTC).',
        data: { name: 'distances', values: distanceData },
        params: [{ name: 'showMeans', value: false }],
        width: 'container',
        height: 350,
        mark: { type: 'circle' },
        encoding: {
            x: { field: 'day', type: 'ordinal', sort: days, title: 'Day of the week (UTC)', axis: { labelAngle: 0 } },
            y: { field: 'distance', type: 'quantitative', title: 'Distance (miles)', scale: { zero: true } },
            color: { field: 'activity', type: 'nominal', title: 'Activity type', scale: { domain: topActivities }, legend: { orient: 'bottom' } },
            size: { condition: { test: 'showMeans', value: 150 }, value: 28 },
            opacity: { condition: { test: 'showMeans', value: 1 }, value: 0.35 },
            tooltip: [
                { field: 'activity', title: 'Activity' },
                { field: 'day', title: 'Day' },
                { field: 'distance', title: 'Distance (mi)', format: '.2f' },
                { field: 'count', title: 'Activities represented', format: ',d' }
            ]
        }
    };

    const button = document.getElementById('aggregate');
    const caption = document.getElementById('distanceVisAggregated');
    // Vega's container sizing needs an explicit width on its embedding elements.
    ['activityVis', 'distanceVis'].forEach(id => {
        document.getElementById(id).style.width = '100%';
    });
    caption.setAttribute('aria-live', 'polite');
    const updateCaption = showMeans => {
        caption.textContent = showMeans
            ? 'Daily means: each point shows the average distance for one activity type on that day.'
            : 'Individual activities: each point shows one completed activity. Hover over a point for details.';
    };
    button.disabled = true;
    button.setAttribute('aria-pressed', 'false');
    if (!distanceData.length) {
        if (activityData.length) {
            await vegaEmbed('#activityVis', activitySpec, { actions: false, renderer: 'svg' });
        } else {
            document.getElementById('activityVis').textContent = 'No completed activities to display.';
        }
        document.getElementById('distanceVis').textContent = 'No distances to display for the most common activities.';
        caption.textContent = '';
        return;
    }
    updateCaption(false);
    const results = await Promise.all([
        vegaEmbed('#activityVis', activitySpec, { actions: false, renderer: 'svg' }),
        vegaEmbed('#distanceVis', distanceSpec, { actions: false, renderer: 'svg' })
    ]);
    const distanceView = results[1].view;
    let showMeans = false;
    button.disabled = false;
    button.addEventListener('click', async function () {
        button.disabled = true;
        const nextMode = !showMeans;
        try {
            // Bonus: update a named dataset in the existing Vega view instead of hiding two charts.
            const change = vega.changeset().remove(() => true).insert(nextMode ? meanData : distanceData);
            await distanceView.change('distances', change).signal('showMeans', nextMode).runAsync();
            showMeans = nextMode;
            button.textContent = showMeans ? 'Show individual activities' : 'Show means';
            button.setAttribute('aria-pressed', String(showMeans));
            updateCaption(showMeans);
        } catch (error) {
            console.error('Could not change chart view:', error);
            caption.textContent = 'Could not change the chart. Please try again.';
        } finally {
            button.disabled = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    loadSavedRunkeeperTweets().then(parseTweets).catch(error => {
        console.error('Could not load activity charts:', error);
        window.alert('Could not load the activity report. Please reload the page.');
    });
});
