/*******************************************************************************
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved. 
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0    
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 *
 ********************************************************************************/

import React from 'react';
import { API, Auth } from 'aws-amplify';
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
      console.log(`getting comments for photo: ${photoId}`)

      let params = {
        headers: { Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}` }
      }

      const response = await API.get('PhotosApi', `/comments/${photoId}`, params);
      console.log(`comments: ${JSON.stringify(response)}`)
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
    let state = await Utils.getAppState(this.props.primaryAppStateUrl, this.props.secondaryAppStateUrl);
    state = state.toUpperCase();

    if (state !== 'ACTIVE') {
      alert('Comments cannot currently be added. Please try again in a few minutes')
      return;
    } else if (this.state.isSecondaryRegion) {
      // At the time the UI was loaded, the application was in FAILOVER mode so the UI is
      // targeting back-end resources in the secondary region. Refreshing the UI will
      // target back-end resources in the primary region.
      alert('Please refresh the application to enable comments');
      return;
    }

    await this.createComment();
  }

  async createComment() {
    try {
      let commentId = uuid.v4()
      let photoId = this.props.imageKey
      let message = this.commentInput.current.value
      let user = this.props.user
      console.log(`${user} created new comment: ${message} for photo: ${photoId}`)

      let params = {
        headers: { Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}` },
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
              <Form.Control type="text" placeholder="Add Comment" ref={this.commentInput} onChange={() => this.handleCommentChanged()} />
            </Col>
            <Col sm={2}>
              <Button variant="primary" onClick={() => this.beginCreateCommentWorkflow()}>
                Create
              </Button>
            </Col>
          </Form.Row>
        </Form>

      </div>
    )
  }
}