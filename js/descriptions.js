let writtenTweets = [];

function parseTweets(runkeeper_tweets) {
    if (!Array.isArray(runkeeper_tweets)) {
        window.alert('No tweets returned');
        return;
    }

    // Cache searchable text once; keep the original dataset number for each tweet.
    writtenTweets = runkeeper_tweets.map((tweet, index) => {
        const parsed = new Tweet(tweet.text, tweet.created_at);
        return { tweet: parsed, number: index + 1, searchText: parsed.writtenText.toLowerCase() };
    }).filter(entry => entry.searchText.length > 0);
    updateSearch();
}

function updateSearch() {
    const text = document.getElementById('textFilter').value;
    const query = text.trim().toLowerCase();
    const matches = query ? writtenTweets.filter(entry => entry.searchText.includes(query)) : [];
    document.getElementById('searchText').textContent = text;
    document.getElementById('searchCount').textContent = matches.length;
    // A single DOM update also clears old rows when the query becomes empty.
    document.getElementById('tweetTable').innerHTML = matches.map(entry => entry.tweet.getHTMLTableRow(entry.number)).join('');
}

function addEventHandlerForSearch() {
    const input = document.getElementById('textFilter');
    input.setAttribute('aria-label', 'Search user-written tweet text');
    document.getElementById('searchCount').parentElement.setAttribute('aria-live', 'polite');
    input.addEventListener('input', updateSearch);
    updateSearch();
}

document.addEventListener('DOMContentLoaded', function () {
    addEventHandlerForSearch();
    loadSavedRunkeeperTweets().then(parseTweets).catch(error => {
        console.error('Could not load searchable tweets:', error);
        window.alert('Could not load tweets. Please reload the page.');
    });
});
