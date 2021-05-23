# devlog-lambda-handlers

This repository contains lambda functions used by the [devlog](https://github.com/AcrylicShrimp/devlog) project.

### Image destination generator

This function generates a presigned S3 post url that allows uploading images directly from the front-end.

### Image handler

This function is triggered when a image is uploaded to the S3. It decodes the given image and extracts/computes some metadata to send them back to the backend server.
