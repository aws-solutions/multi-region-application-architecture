#!/bin/bash
#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh source-bucket-base-name solution-name version-code
#
# Parameters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#    For example: ./build-s3-dist.sh solutions my-solution v1.0.0
#    The template will then expect the source code to be located in the solutions-[region_name] bucket
#
#  - solution-name: name of the solution for consistency
#
#  - version-code: version of the package

# Check to see if input has been provided:
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "Please provide the base source bucket name, trademark approved solution name and version where the lambda code will eventually reside."
    echo "For example: ./build-s3-dist.sh solutions trademarked-solution-name v1.0.0"
    exit 1
fi

# define main directories
template_dir="$PWD"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../source"

# clean up old build files
rm -rf $template_dist_dir
mkdir -p $template_dist_dir
rm -rf $build_dist_dir
mkdir -p $build_dist_dir

SUB1="s/CODE_BUCKET/$1/g"
SUB2="s/SOLUTION_NAME/$2/g"
SUB3="s/SOLUTION_VERSION/$3/g"

for FULLNAME in ./*.yaml
do
  TEMPLATE=`basename $FULLNAME`
  echo "Preparing $TEMPLATE"
  sed -e $SUB1 -e $SUB2 -e $SUB3 $template_dir/$TEMPLATE > $template_dist_dir/"${TEMPLATE%.yaml}.template"
  # also move the CFN templates to the build dist dir for referencing it as a nested template
  cp $template_dist_dir/"${TEMPLATE%.yaml}.template" $build_dist_dir/"${TEMPLATE%.yaml}.template"
done

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
  echo "Building $lambda_package"
  echo "------------------------------------------------------------------------------"
  cd $source_dir/$lambda_package
  npm run clean
  mkdir package
  rsync -r --exclude=*.spec.ts source/ ./package/ && cp package.json package-lock.json tsconfig.json ./package
  cd package && npm run package
  # Check the result of the package step and exit if a failure is identified
  if [ $? -eq 0 ]
  then
    echo "Package for $lambda_package built successfully"
  else
    echo "******************************************************************************"
    echo "Package build FAILED for $lambda_package"
    echo "******************************************************************************"
    exit 1
  fi
  zip -q -r9 $build_dist_dir/$lambda_package.zip *
done

echo "------------------------------------------------------------------------------"
echo "Building Web App Console"
echo "------------------------------------------------------------------------------"
cd $source_dir/console
[ -e build ] && rm -r build
[ -e node_modules ] && rm -rf node_modules
npm ci
npm run build
mkdir $build_dist_dir/console
cp -r ./build/* $build_dist_dir/console/

echo "------------------------------------------------------------------------------"
echo "Generate console manifest file"
echo "------------------------------------------------------------------------------"
cd $build_dist_dir
manifest=(`find console -type f | sed 's|^./||'`)
manifest_json=$(IFS=,;printf "%s" "${manifest[*]}")
echo "[\"$manifest_json\"]" | sed 's/,/","/g' > ./console-manifest.json
