// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

import React from 'react';
import { API } from 'aws-amplify';
import { Form, Button, Col } from 'react-bootstrap'

import * as uuid from 'uuid'

import Utils from '../Common';

export default class Comments extends React.Component {

  constructor(props) {
    super(props)

    this.getComments = this.getComments.bind(this)
    this.createComment = this.createComment.bind(this)

    this.state = {
      comments: [],
      newComment: '',
      isSecondaryRegion: props.isSecondaryRegion
    }

    this.commentInput = React.createRef()
  }

  async componentDidMount() {
    let comments = await this.getComments()
    this.setState({
      comments
    })
  }

  componentWillUnmount() {
    this.setState({
      comments: []
    })
  }

  async getComments() {

    try {
      let photoId = this.props.imageKey

      const response = await API.get('PhotosApi', `/comments/${photoId}`, {});
      return response.comments
    } catch (err) {
      console.log(err)
      return []
    }
  }

  handleCommentChanged() {
    this.setState({
      newComment: this.commentInput.current.value
    })
  }

  async beginCreateCommentWorkflow() {
    let appState = await Utils.getAppState(this.props.primaryAppStateUrl, this.props.secondaryAppStateUrl);
    appState = appState.toUpperCase();

    switch (appState) {
      case 'FENCED':
        // Write operations are not permitted when the application is in fenced mode
        alert('Comments cannot currently be added. Please try again in a few minutes')
        return;
      case 'ACTIVE':
        if (this.state.isSecondaryRegion) {
          // When the application is in ACTIVE mode, only allow write operations when the 
          // front-end is targeting the primary region
          alert('Please refresh the application to enable comments');
          return;
        }
        break;
      case 'FAILOVER':
        if (!this.state.isSecondaryRegion) {
          // When the application is in FAILOVER mode, only allow write operations when the 
          // front-end is targeting the secondary region
          alert('Please refresh the application to enable comments');
          return;
        }
        break;
      default:
        throw new Error(`Unsupported app state: ${appState}`);
    }

    await this.createComment();
  }

  async createComment() {
    try {
      let commentId = uuid.v4()
      let photoId = this.props.imageKey
      let message = this.commentInput.current.value
      let user = this.props.user

      let params = {
        body: {
          commentId,
          photoId,
          user,
          message
        }
      }

      await API.post('PhotosApi', `/comments/${photoId}`, params);

      let updatedComments = this.state.comments
      updatedComments.push({
        user,
        commentId,
        message
      })

      this.setState({
        comments: updatedComments,
        newComment: ''
      })

      this.commentInput.current.value = ''
    } catch (err) {
      console.log(err)
    }
  }

  render() {

    return (
      <div>

        <div className='commentsCol'>
          <ul className='list-group'>
            {
              this.state.comments.map(comment => {
                return <li key={comment.commentId} className='list-group-item'>{comment.user} says: {comment.message}</li>
              })
            }
          </ul>
        </div>

        <Form className='commentsForm'>
          <Form.Row>
            <Col>
              <Form.Control type="text" placeholder="Add Comment" id="add-comment-input" ref={this.commentInput} onChange={() => this.handleCommentChanged()} />
            </Col>
            <Col sm={2}>
              <Button variant="primary" id="create-comment-btn" onClick={() => this.beginCreateCommentWorkflow()}>
                Create
              </Button>
            </Col>
          </Form.Row>
        </Form>

      </div>
    )
  }
}