// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

import React from 'react';
import Amplify from 'aws-amplify';
import { Auth, Storage } from 'aws-amplify'
import { PhotoPicker, withAuthenticator } from 'aws-amplify-react'
import { Button, Modal, ProgressBar, Navbar } from 'react-bootstrap'

import * as uuid from 'uuid'

import Gallery from './views/Gallery'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faUpload, faSignOutAlt, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons'
import { faAws } from '@fortawesome/free-brands-svg-icons';

import Utils from './Common';

library.add(
  faUpload
)

class App extends React.Component {
  constructor(props) {
    super(props)
    this.signOut = this.signOut.bind(this)
    this.beginUploadImageWorkflow = this.beginUploadImageWorkflow.bind(this)

    this.state = {
      showImageGallery: false,
      showUploadImageModal: false,
      uploadInProgress: false,
      username: '',
      region: '',
      primaryAppStateUrl: props.primaryAppStateUrl,
      secondaryAppStateUrl: props.secondaryAppStateUrl,
      appConfig: props.appConfig
    }
  }

  async componentDidMount() {
    let user = await Auth.currentAuthenticatedUser();
    let appState = await Utils.getAppState(this.state.primaryAppStateUrl, this.state.secondaryAppStateUrl);
    appState = appState.toUpperCase();

    const uiState = { username: user.username, showImageGallery: true };
    const amplifyConfig = {
      Storage: {
        AWSS3: {
          identityPoolId: this.state.appConfig.identityPoolId,
        },
        level: 'public'
      },
      API: {
        endpoints: [
          {
            name: 'PrimaryAppState',
            endpoint: this.state.primaryAppStateUrl,
            region: this.state.appConfig.primary.region
          },
          {
            name: 'SecondaryAppState',
            endpoint: this.state.secondaryAppStateUrl,
            region: this.state.appConfig.secondary.region
          }
        ]
      }
    };

    switch (appState) {
      case 'FENCED':
      case 'ACTIVE':
        uiState.isSecondaryRegion = false;
        uiState.region = this.state.appConfig.primary.region;
        amplifyConfig.Storage.AWSS3.bucket = this.state.appConfig.primary.objectStoreBucketName;
        amplifyConfig.Storage.AWSS3.region = this.state.appConfig.primary.region;
        amplifyConfig.API.endpoints.push({ name: 'PhotosApi', endpoint: this.state.appConfig.primary.photosApi, region: this.state.appConfig.primary.region });
        break;
      case 'FAILOVER':
        uiState.isSecondaryRegion = true;
        uiState.region = this.state.appConfig.secondary.region;
        amplifyConfig.Storage.AWSS3.bucket = this.state.appConfig.secondary.objectStoreBucketName;
        amplifyConfig.Storage.AWSS3.region = this.state.appConfig.secondary.region;
        amplifyConfig.API.endpoints.push({ name: 'PhotosApi', endpoint: this.state.appConfig.secondary.photosApi, region: this.state.appConfig.secondary.region });
        break;
      default:
        throw new Error(`Unsupported app state: ${appState}`);
    }

    Amplify.configure(amplifyConfig);
    this.setState(uiState);
  }

  signOut() {
    Auth.signOut()
      .catch(err => console.log(err))
  }

  async beginUploadImageWorkflow() {
    let appState = await Utils.getAppState(this.state.primaryAppStateUrl, this.state.secondaryAppStateUrl);
    appState = appState.toUpperCase();

    switch (appState) {
      case 'FENCED':
        // Write operations are not permitted when the application is in fenced mode
        alert('New photos can not currently be uploaded. Please try again in a few minutes')
        return;
      case 'ACTIVE':
        if (this.state.isSecondaryRegion) {
          // When the application is in ACTIVE mode, only allow write operations when the 
          // front-end is targeting the primary region
          alert('Please refresh the application to enable photo uploads');
          return;
        }
        break;
      case 'FAILOVER':
        if (!this.state.isSecondaryRegion) {
          // When the application is in FAILOVER mode, only allow write operations when the 
          // front-end is targeting the secondary region
          alert('Please refresh the application to enable photo uploads');
          return;
        }
        break;
      default:
        throw new Error(`Unsupported app state: ${appState}`);
    }

    this.setState({ showUploadImageModal: true })
  }

  async uploadImage(image) {

    // An id for the image will be the image's S3 key and DynamoDB hash key
    let id = uuid.v4()

    this.setState({
      uploadInProgress: true
    })

    Storage.put(id, image.file)
      .finally(() => {
        this.setState({
          uploadInProgress: false,
          showUploadImageModal: false
        })
        window.location.reload();
      })
  }

  render() {
    return (
      <div>
        <Navbar bg="dark" variant="dark">
          <Navbar.Brand href="/"> <FontAwesomeIcon icon={faAws} size="lg" color="#FF9900" id="logo" />Current Region: {this.state.region}</Navbar.Brand>
          <Button variant="link" id="upload-image-btn" className='nav-link' onClick={() => this.beginUploadImageWorkflow()}>
            <FontAwesomeIcon icon={faUpload} /> Upload Image
          </Button>
          <Navbar.Collapse className="justify-content-end">
            <Navbar.Text>
              welcome {this.state.username}
            </Navbar.Text>
            <Button variant="link" className='nav-link' onClick={() => this.signOut()}><FontAwesomeIcon id="icon" icon={faSignOutAlt} />Sign Out</Button>
          </Navbar.Collapse>
        </Navbar>

        <div className="main">
          {this.state.showImageGallery && <Gallery user={this.state.username} primaryAppStateUrl={this.state.primaryAppStateUrl} secondaryAppStateUrl={this.state.secondaryAppStateUrl} isSecondaryRegion={this.state.isSecondaryRegion} />}
        </div>


        <Modal show={this.state.showUploadImageModal} onHide={() => this.setState({ showUploadImageModal: false })}>
          <Modal.Header closeButton>
            <Modal.Title>Upload Image</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {this.state.uploadInProgress ? null : <PhotoPicker onPick={data => this.uploadImage(data)} />}
            {
              this.state.uploadInProgress ?
                <div>
                  <h1>Uploading...</h1>
                  <ProgressBar animated now={60} />
                </div> : null
            }
          </Modal.Body>
        </Modal>

        <div className="footer">
          <p>Find out more at <a className="text-link" href="https://aws.amazon.com/solutions/"
            target="_blank"
            rel="noopener noreferrer">
            aws solutions <FontAwesomeIcon size="sm" icon={faExternalLinkAlt} />
          </a></p>
        </div>
      </div>
    )
  }
}

export default withAuthenticator(App);
