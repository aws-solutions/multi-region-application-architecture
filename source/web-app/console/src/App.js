/*******************************************************************************
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. 
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
import Amplify, { Auth, Storage } from 'aws-amplify'
import { PhotoPicker, withAuthenticator, AmplifyTheme } from 'aws-amplify-react'
import { Button, Modal, ProgressBar, Navbar } from 'react-bootstrap'

import * as uuid from 'uuid'

import Gallery from './views/Gallery'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faUpload, faSignOutAlt, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons'
import { faAws } from '@fortawesome/free-brands-svg-icons';

declare var amplifyConfig;
Amplify.configure(amplifyConfig);

Storage.configure({ level: 'public' })

library.add(
  faUpload
)

const loginTheme = {
  sectionFooterSecondaryContent:{
    ...AmplifyTheme.sectionFooterSecondaryContent,
    display:"none"
  }
}

class App extends React.Component {

  constructor(props) {
    super(props)
    this.signOut = this.signOut.bind(this)

    this.state = {
      showUploadImageModal: false,
      uploadInProgress: false,
      username: ''
    }
  }

  async componentDidMount() {
    let user = await Auth.currentAuthenticatedUser()
    this.setState({
      username: user.username
    })
  }

  signOut() {
    Auth.signOut()
      .catch(err => console.log(err))
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
        <Navbar.Brand href="/"> <FontAwesomeIcon icon={faAws} size="lg" color="#FF9900" id="logo" />Multi Region</Navbar.Brand>
          <Button variant="link" className='nav-link' onClick={() => this.setState({showUploadImageModal: true})}>
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
          <Gallery user={this.state.username} />
        </div>


        <Modal show={this.state.showUploadImageModal} onHide={() => this.setState({showUploadImageModal: false})}>
          <Modal.Header closeButton>
            <Modal.Title>Modal heading</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            { this.state.uploadInProgress ? null : <PhotoPicker onPick={data => this.uploadImage(data)} /> }
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
            aws solutions <FontAwesomeIcon size="sm" icon={faExternalLinkAlt}/>
          </a></p>
        </div>

      </div>
    )
  }
}


export default withAuthenticator(App,false,[],null,loginTheme);
