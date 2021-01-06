// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

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