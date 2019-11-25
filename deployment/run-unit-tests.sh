#!/bin/bash
#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./run-unit-tests.sh
#

# Get reference for all important folders
template_dir="$PWD"
source_dir="$template_dir/../source"

echo "------------------------------------------------------------------------------"
echo "[Test] Object Store Layer Custom Resource"
echo "------------------------------------------------------------------------------"
cd $source_dir/object-store-layer/custom-resource
npm install --silent
npm test

echo "------------------------------------------------------------------------------"
echo "[Test] Serverless App Layer Custom Resource"
echo "------------------------------------------------------------------------------"
cd $source_dir/serverless-app-layer/custom-resource
npm install --silent
npm test

echo "------------------------------------------------------------------------------"
echo "[Test] Web App Custom Resource"
echo "------------------------------------------------------------------------------"
cd $source_dir/web-app/custom-resource
npm install --silent
npm test

echo "------------------------------------------------------------------------------"
echo "[Test] Web App Layer Custom Resource"
echo "------------------------------------------------------------------------------"
cd $source_dir/web-app-layer/custom-resource
npm install --silent
npm test
