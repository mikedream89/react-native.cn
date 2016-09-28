import React, { PropTypes, Component } from 'react';
// import { Link } from 'react-router';

import Container from '../components/Container';
import './Blog.styl';
import CONSTANTS from '../constants';
import { loadResource, loadResources, getResource } from '../logic/loadResource';

export default class Blog extends Component {

  static fetchData() {
    const v = loadResource(`${CONSTANTS.bbs}/api/category/3`);
    let blogList;
    let data;
    if (v && typeof v.then === 'function') {
      return v.then(ret => {
        data = ret;
        blogList = JSON.parse(data);
        return loadResources(blogList.topics.map(t => `${CONSTANTS.bbs}/api/topic/${t.tid}`))
      }).then(map => {
        if (map) {
          map[`${CONSTANTS.bbs}/api/category/3`] = data;
        }
        return map;
      });
    } else {
      blogList = JSON.parse(v);
      return loadResources(blogList.topics.map(t => `${CONSTANTS.bbs}/api/topic/${t.tid}`));
    }
  }
  state = {};
  componentWillMount() {
    const blogList = JSON.parse(getResource(`${CONSTANTS.bbs}/api/category/3`));
    const blogDetailedList =
      blogList.topics.map(t => JSON.parse(getResource(`${CONSTANTS.bbs}/api/topic/${t.tid}`)));
    this.setState({
      blogDetailedList,
    });
  }
  componentDidMount() {
    window.addEventListener('scroll', this.onScroll);
  }
  componentWillUnmount() {
    window.removeEventListener('scroll', this.onScroll);
  }
  onScroll = () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
      this.fetchMore();
    }
  };
  currentPage = 1;
  parseBlogBody = (rawBody, link) => {
    const endFlag = /<hr \/>([\s\S]*?)<hr \/>/;
    let parsedText = endFlag.exec(rawBody);
    parsedText = parsedText ? parsedText[1] : rawBody;
    parsedText = parsedText.replace(/\/uploads\/file/g, `${CONSTANTS.bbs}/uploads/file`);
    return `${parsedText}<a href="${link}" class="more">[阅读全文]</a>`;
  };
  fetchMore = () => {
    if (this.fetching || this.fetchOver) {
      return;
    }
    this.fetching = true;
    storage.sync.blogList({
      query: `?page=${this.currentPage + 1}`,
      resolve: blogList => {
        if (blogList.topics) {
          const {currentPage, pageCount} = blogList.pagination;
          if (currentPage === pageCount) {
            this.fetchOver = true;
          }
          this.currentPage = currentPage;
          return storage.getBatchData(blogList.topics.map(t => ({key: 'post', id: t.tid})))
            .then(blogs => {
              this.setState({
                blogDetailedList: this.state.blogDetailedList.concat(blogs),
              });
              this.fetching = false;
            });
        } else {
          this.fetchOver = true;
        }
      }
    });
  }
  render() {
    const { blogDetailedList } = this.state;
    // const blogList = blogDetailedList.concat(this.state.appendList);
    return (
      <Container type="blog">
        {
          blogDetailedList.map(topic => {
            const post = topic.posts[0];
            return (
              <div className="post-list-item" key={post.tid}>
                <div className="post-header">
                  <a
                    className="post-title"
                    href={`/post/${post.tid}`}
                    dangerouslySetInnerHTML={{ __html: topic.title }}
                  />
                  <div className="meta">
                    { post.timestampISO.split('T')[0] }
                    {' by '}
                    <a
                      target="_blank"
                      href={`${CONSTANTS.bbs}/user/${post.user.username}`}
                    >
                      {post.user.username}
                    </a>
                  </div>
                </div>
                <div
                  className="post"
                  dangerouslySetInnerHTML={{
                    __html: this.parseBlogBody(post.content, `/post/${post.tid}`),
                  }}
                />
                <hr />
              </div>
            );
          })
        }
      </Container>
    );
  }
}
