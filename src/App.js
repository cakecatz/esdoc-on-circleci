import http from 'http';
import url from 'url';
import fetch from 'node-fetch';
import config from '../config.json';

export class CircleCI {
  constructor(token) {
    this.apiBaseUrl = 'https://circleci.com/api/v1/';
    this.token = token;
  }

  getRecentBranch() {
    const REQUEST_URL = `${this.apiBaseUrl}recent-builds?circle-token=${this.token}`;
    return new Promise((resolve, reject) => {
      fetch(REQUEST_URL, {
        'headers': {
          'Accept': 'application/json',
        },
      }).then((res) => {
        return res.json();
      }).then((data) => {
        resolve(data[0].build_num);
      }).catch(reject);
    });
  }

  getBranchBuilds() {
    const REQUEST_URL = `${this.apiBaseUrl}project/${config.user}/${config.repoName}/tree/${config.branch}?circle-token=${this.token}`;
    return new Promise((resolve, reject) => {
      fetch(REQUEST_URL, {
        'headers': {
          'Accept': 'application/json',
        },
      }).then((res) => {
        return res.json();
      }).then((data) => {
        resolve(data[0].build_num);
      }).catch(reject);
    });
  }
}

export default class App {
  constructor() {
    this.port = config.port;
    this.server = http.createServer(this.onRequest.bind(this));
    this.server.on('connect', this.onConnect.bind(this));
    this.server.on('close', this.onClose.bind(this));
    this.memory = [];
  }

  start() {
    this.server.listen(this.port);
  }

  onRequest(request, response) {
    const params = url.parse(request.url, true);
    if (params.query.token) {
      if (!this.memory[params.query.token]) {
        this.memory[params.query.token] = new CircleCI(params.query.token);
      }
      this.access(params, this.memory[params.query.token], response);
    } else {
      response.writeHead(404);
      response.end();
    }
  }

  access(params, circleci, response) {
    let redirected = false;
    circleci.getBranchBuilds().then((recentBuildNum) => {
      const fetchUrl = `${this.getArtifactsPath(params.pathname, recentBuildNum)}?circle-token=${params.query.token}`;
      fetch(fetchUrl).then((res) => {
        if (!res.ok) {
          response.writeHead(404);
          response.end();
          return false;
        }

        const contentType = res.headers.get('content-type');
        if (contentType.indexOf('image') >= 0) {
          response.setHeader('Content-Type', contentType);
        } else {
          response.writeHead(302, {
            'Location': fetchUrl,
          });
          response.end();
          redirected = true;
        }
        return res.text();
      }).then((body) => {
        if (!redirected && body) {
          response.write(body);
          response.end();
        }
      });
    });
  }

  getArtifactsPath(pathname, buildNum) {
    return `https://circle-artifacts.com/gh/${config.user}/${config.repoName}/${buildNum}/artifacts/${config.container}${pathname}`;
  }

  onConnect() {

  }

  onClose() {

  }
}
