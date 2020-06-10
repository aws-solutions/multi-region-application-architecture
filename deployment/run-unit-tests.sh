#!/bin/bash
#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./run-unit-tests.sh
#

# Get reference for source directory
source_dir="$PWD/../source"

declare -a lambda_packages=(
  "dynamodb-global-table-configurer"
  "presentation-configurer"
  "routing-configurer"
  "stack-name-formatter"
  "stackset-resource"
  "user-pool-pre-sign-up-trigger"
  "user-pool-replicator"
  "user-pool-syncer"
  "uuid-generator"
)

for lambda_package in "${lambda_packages[@]}"
do
    echo "------------------------------------------------------------------------------"
    echo "Testing $lambda_package"
    echo "------------------------------------------------------------------------------"
    cd $source_dir/$lambda_package
    npm run clean
    npm ci
    npm test
    # Check the result of the npm test and exit if a failed test is identified
    if [ $? -eq 0 ]
    then
      echo "Tests passed for $lambda_package"
    else
      echo "******************************************************************************"
      echo "Tests FAILED for $lambda_package"
      echo "******************************************************************************"
      exit 1
    fi
    npm run clean
done
