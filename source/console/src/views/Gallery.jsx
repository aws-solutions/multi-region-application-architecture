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
import { Storage } from 'aws-amplify'
import { Container, Row, Col, Image, Modal } from 'react-bootstrap'

import Comments from './Comments'

export default class Gallery extends React.Component {

  constructor(props) {
    super(props)

    this.loadImages = this.loadImages.bind(this);
    this.imageSelected = this.imageSelected.bind(this)
    this.state = {
      images: [],
      selectedImage: {},
      showImageDetailsModal: false,
      isSecondaryRegion: props.isSecondaryRegion
    }
  }

  async componentDidMount() {
    await this.loadImages();
  }

  componentWillUnmount() {
    this.setState({
      images: []
    })
  }

  async loadImages() {
    const path = '';
    const level = { level: 'public' };
    this.setState({ images: [] });
    let s3Images = await Storage.list(path, level);

    s3Images.map(async item => {
      let presignedUrl = await Storage.get(item.key, level)
      this.setState({
        images: [
          ...this.state.images,
          {
            key: item.key,
            presignedUrl
          }
        ]
      });
    });
  }

  async imageSelected(image) {
    this.setState({
      showImageDetailsModal: true,
      selectedImage: image
    })
  }

  render() {
    let { images } = this.state
    let imgTags = images.map(image => {
      return (
        <Image
          thumbnail
          key={image.key}
          src={image.presignedUrl}
          onClick={() => this.imageSelected(image)}
          className='thumbnail' />

      )
    })

    return (
      <div>

        {imgTags}

        <Modal size='lg' className='detailsModal' show={this.state.showImageDetailsModal} onHide={() => this.setState({ showImageDetailsModal: false })}>
          <Modal.Body>
            <Container>
              <Row>
                <Col>
                  <Image fluid src={this.state.selectedImage.presignedUrl} />
                </Col>
                <Col>
                  <Comments imageKey={this.state.selectedImage.key} user={this.props.user} primaryAppStateUrl={this.props.primaryAppStateUrl} secondaryAppStateUrl={this.props.secondaryAppStateUrl} isSecondaryRegion={this.state.isSecondaryRegion} />
                </Col>
              </Row>
            </Container>
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}