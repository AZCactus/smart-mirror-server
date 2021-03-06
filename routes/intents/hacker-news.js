var api = require("hackernews-api");
var request = require('request');
var html2text = require("html-to-text");
var socketing = require('../../sockets');

function topStories(callback){

  var summary = 'Today\'s Top Hacker News Stories:';
  var LIMIT = 10, finished = 0;
  var spokenSummaries = [], storySummaries = [];
  for(var i = 0; i < LIMIT; i++) {
    spokenSummaries.push('');
    storySummaries.push({});
  }


  request('https://hacker-news.firebaseio.com/v0/topstories.json', function(error, response, body){
    if(error) {
      console.error(error);
      summary = 'There was an error trying to retrieve the top Hacker News stories';
      callback(summary);
    } else {
      var stories = JSON.parse(body);
      stories.slice(0, LIMIT).forEach(function(id, i){ 
        request('https://hacker-news.firebaseio.com/v0/item/' + id + '.json', function(error, response, body){
          if(error) {
            console.error(error);
          } else {
            var story = JSON.parse(body);
            spokenSummaries[i] += '<s>Number ' + (i+1) + ': ' + story.title + '</s>';
            storySummaries[i] = story;
          }
          finished++;
          if(finished >= LIMIT) {
            sendItBack();
          }
        });
      });
    }
  });

  function sendItBack() {
    summary += spokenSummaries.join(' ');
    socketing.socket && socketing.socket.emit('hn-topstories', encodeURIComponent(JSON.stringify(storySummaries)));
    callback(summary);
  }
}

function topComment(callback, slots){
  var summary = '';
  console.log(slots);
  
  request('https://hacker-news.firebaseio.com/v0/topstories.json', function(error, response, body){
    if(error) {
      console.error(error);
      summary = 'There was an error trying to retrieve the top Hacker News stories';
      callback(summary);
    } else {
      var stories = JSON.parse(body),
          id = stories[slots['StoryNumber'].value - 1];
      request('https://hacker-news.firebaseio.com/v0/item/' + id + '.json', function(error, response, body){
        if(error) {
          console.error(error);
          summary = 'There was an error getting that Hacker News story';
          callback(summary);
        } else {
          var story = JSON.parse(body);
          if(story.kids && story.kids.length) {
            request('https://hacker-news.firebaseio.com/v0/item/' + story.kids[0] + '.json', function(error, response, body){
              if(error) {
                console.error(error);
                summary = 'There was an error getting that Hacker News comment';
                callback(summary);
              } else {
                var topComment = JSON.parse(body);
                if(topComment && topComment.text) {
                  var topCommentText = topComment.text;
                  topCommentText = topCommentText.replace(/<i>&gt;/, '<i> Quote: ');
                  topCommentText = topCommentText.replace(/(<p>)?<pre>.*<\/pre>/, '');
                  topCommentText = topCommentText.slice(0,topCommentText.indexOf('<p>', topCommentText.indexOf('<p>')+1));
                  topCommentText = html2text.fromString(topCommentText);
                  topCommentText = topCommentText.replace(/\n+/g, ' ');
                  summary= '<s>Top Comment:</s>' + topCommentText + ' ';
                  socketing.socket && socketing.socket.emit('hn-topcomment', encodeURIComponent(JSON.stringify({
                    story: story,
                    comment: topComment
                  })));
                  callback(summary);
                } else {
                  summary = 'There are no comments on that Hacker News story';
                  callback(summary);
                }
              }
            });
          } else {
            summary = 'There are no comments on that Hacker News story';
            callback(summary);
          }
        }
      });
    }
  });
}

function topStoriesWithComment(callback) {

  var summary = 'Today\'s Top Hacker News Stories:';
  var LIMIT = 10, finished = 0;
  var spokenSummaries = [];
  for(var i = 0; i < LIMIT; i++) {
    spokenSummaries.push('');
  }

  request('https://hacker-news.firebaseio.com/v0/topstories.json', function(error, response, body){
    if(error) {
      console.error(error);
      summary = 'There was an error trying to retrieve the top Hacker News stories';
      callback(summary);
    } else {
      var stories = JSON.parse(body);
      stories.slice(0,LIMIT).forEach(function(id, i){ 
        request('https://hacker-news.firebaseio.com/v0/item/' + id + '.json', function(error, response, body){
          if(error) {
            finished++;
            console.error(error);
          } else {
            var story = JSON.parse(body);
            spokenSummaries[i] += '<s>Number ' + (i+1) + ': ' + story.title + '</s>';
            
            if(story.kids && story.kids.length) {
              request('https://hacker-news.firebaseio.com/v0/item/' + story.kids[0] + '.json', function(error, response, body){
                if(error) {
                  console.error(error);
                } else {
                  var topComment = JSON.parse(body);
                  if(topComment && topComment.text) {
                    var topCommentText = topComment.text;
                    topCommentText = topCommentText.replace(/<i>&gt;/, '<i> Quote: ');
                    topCommentText = topCommentText.replace(/(<p>)?<pre>.*<\/pre>/, '');
                    topCommentText = topCommentText.slice(0,topCommentText.indexOf('<p>', topCommentText.indexOf('<p>')+1));
                    topCommentText = html2text.fromString(topCommentText);
                    topCommentText = topCommentText.replace(/\n+/g, ' ');
                    spokenSummaries[i] += '<s>Top Comment:</s>' + topCommentText + ' ';
                  }
                }

                finished++;
                if(finished >= LIMIT) {
                  sendItBack();
                }
              });
            } else {
              finished++;
              if(finished >= LIMIT) {
                sendItBack();
              }
            }
          }
        });
      });
    }
  });

  function sendItBack() {
    summary += spokenSummaries.join(' ');
    callback(summary);
  }
};

module.exports = {
  topStories: topStories,
  topComment: topComment,
  topStoriesWithComment: topStoriesWithComment
};