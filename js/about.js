function parseTweets(runkeeper_tweets) {
    if (!Array.isArray(runkeeper_tweets)) {
        window.alert('No tweets returned');
        return;
    }

    const tweets = runkeeper_tweets.map(tweet => new Tweet(tweet.text, tweet.created_at));
    document.getElementById('numberTweets').textContent = tweets.length;

    // Sorting a separate list of valid dates works even when tweets are unsorted.
    const dates = tweets.map(tweet => tweet.time).filter(date => !Number.isNaN(date.getTime()));
    dates.sort((a, b) => a.getTime() - b.getTime());
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
    document.getElementById('firstDate').textContent = dates.length ? dates[0].toLocaleDateString('en-US', dateOptions) : 'No dated tweets';
    document.getElementById('lastDate').textContent = dates.length ? dates[dates.length - 1].toLocaleDateString('en-US', dateOptions) : 'No dated tweets';

    const categories = { completed_event: 0, live_event: 0, achievement: 0, miscellaneous: 0 };
    let writtenCompleted = 0;
    tweets.forEach(tweet => {
        categories[tweet.source] += 1;
        if (tweet.source === 'completed_event' && tweet.written) {
            writtenCompleted += 1;
        }
    });

    const setText = (selector, value) => document.querySelectorAll(selector).forEach(element => {
        element.textContent = value;
    });
    const percentage = (count, total) => (total ? 100 * count / total : 0).toFixed(2) + '%';
    const categoryClasses = {
        completed_event: 'completedEvents', live_event: 'liveEvents',
        achievement: 'achievements', miscellaneous: 'miscellaneous'
    };
    Object.keys(categoryClasses).forEach(source => {
        const className = categoryClasses[source];
        setText('.' + className, categories[source]);
        setText('.' + className + 'Pct', percentage(categories[source], tweets.length));
    });
    setText('.written', writtenCompleted);
    setText('.writtenPct', percentage(writtenCompleted, categories.completed_event));
}

document.addEventListener('DOMContentLoaded', function () {
    loadSavedRunkeeperTweets().then(parseTweets).catch(error => {
        console.error('Could not load tweet summary:', error);
        window.alert('Could not load tweets. Please reload the page.');
    });
});
