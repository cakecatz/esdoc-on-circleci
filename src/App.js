import http from 'http';
import url from 'url';
import fetch from 'node-fetch';
import config from '../config.json';

class CircleCI {
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
}

export default class App {
  constructor() {
    this.port = 8080;
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

      switch (params.pathname) {
      case '/index':
        this.index(this.memory[params.query.token], response);
        break;
      case '/badge':
        this.badge(this.memory[params.query.token], response, params.query.token);
        break;
      default:
      }
    } else {
      response.writeHead(404);
      response.end();
    }
  }

  index(circleci, response) {
    circleci.getRecentBranch().then((recentBuildNum) => {
      response.writeHead(302, {
        'Location': this.getEsdocUrl(recentBuildNum),
      });
      response.end();
    });
  }

  badge(circleci, response, token) {
    circleci.getRecentBranch().then((recentBuildNum) => {
      fetch(`${this.getEsdocBadgeUrl(recentBuildNum)}?circle-token=${token}`).then((res) => {
        return res.text();
      }).then((body) => {
        response.setHeader('Content-Type', 'image/svg+xml');
        response.write(body);
        response.end();
      });
    });
  }

  getEsdocUrl(buildNum) {
    return `https://circle-artifacts.com/gh/${config.user}/${config.repoName}/` +
      `${buildNum}/artifacts/${config.container}/home/ubuntu/${config.repoName}/esdoc/index.html`;
  }

  getEsdocBadgeUrl(buildNum) {
    return `https://circle-artifacts.com/gh/${config.user}/${config.repoName}/` +
      `${buildNum}/artifacts/${config.container}/home/ubuntu/${config.repoName}/esdoc/badge.svg`;
  }

  onConnect() {

  }

  onClose() {

  }
}
