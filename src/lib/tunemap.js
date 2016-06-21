import youtubeParser from './parsers/youtube';
import spotify from './providers/spotify';

export default function Tunemap() {
  function createButton(
    classList,
    text,
    appendTo = document.getElementById('watch7-subscription-container')) {
    const button = document.createElement('a');
    button.textContent = text;

    for (const cssClass of classList) {
      button.classList.add(cssClass);
    }

    appendTo.parentNode.insertBefore(button, appendTo.nextSibling);

    function update(msg, href = '#', enabled = false) {
      button.textContent = msg;
      button.href = href;

      if (enabled) {
        button.classList.remove('disabled');
        return;
      }

      button.classList.add('disabled');
    }

    return {
      disable(msg, href) {
        update(msg, href, false);
      },
      enable(msg, href) {
        update(msg, href, true);
      },
      elem: button,
    };
  }

  function load(ga) {
    const youtube = youtubeParser();
    const ytRegex = /https?:\/\/www\.youtube\.com\/watch\?v=.*/g;
    if (!document.location.href.match(ytRegex)) return;
    const videoId = youtube.extractVideoId(document.location.href);
    ga.sendPageView();

    let videoTitle = document.querySelector('#eow-title').textContent;
    if (!videoTitle) return;

    const songInfo = youtube.getInfoFromTitle(videoTitle);
    const description = document.querySelector('#eow-description');
    const button = createButton(['tunemap-open-button', 'disabled']);
    const spotifyUrl = youtube.searchSpotifyUrls(description);

    const isMusicCategory = [...document.querySelectorAll('.watch-info-tag-list li a')]
      .some(elem => elem.getAttribute('data-ytid') === 'UC-9-kyTW8ZkZNDHQJ6FgpwQ');

    videoTitle = [songInfo.artist, songInfo.title, songInfo.remix].join(' ');
    button.disable('Loading...');

    if (youtube.isMix(description.innerHTML)) {
      button.disable('Mix not available in Spotify');
      if (!spotifyUrl) return;

      button.enable('Open the tracklist on Spotify', spotifyUrl);
      return;
    }

    if (!isMusicCategory && !youtube.maybeIsMusic(description.innerHTML)) {
      button.disable('Not in music category');
      return;
    }

    spotify()
      .search(videoTitle, 'track', youtube.getCountryCode())
      .then(data => {
        if (data.tracks.items && data.tracks.items[0]) {
          ga.sendSongInfo(videoId, data.tracks.items[0].uri);

          button.enable('Open in Spotify', data.tracks.items[0].uri);
          button.elem.addEventListener('mousedown', () => {
            document.querySelector('.video-stream').pause();
            ga.sendButtonClick(videoId, data.tracks.items[0].uri);
          });

          return;
        }

        ga.sendSongNotFound(videoId);
        button.disable('Not available in Spotify');
      });
  }

  return {
    load,
  };
}
