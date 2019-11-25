#!/bin/bash
#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh source-bucket-base-name solution-name version-code
#
# Paramenters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#    For example: ./build-s3-dist.sh solutions v1.0.0
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

# Get reference for all important folders
template_dir="$PWD"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../source"

echo "------------------------------------------------------------------------------"
echo "[Init] Clean old dist, node_modules and bower_components folders"
echo "------------------------------------------------------------------------------"
echo "rm -rf $template_dist_dir"
rm -rf $template_dist_dir
mkdir -p $template_dist_dir
rm -rf $build_dist_dir
mkdir -p $build_dist_dir

echo "------------------------------------------------------------------------------"
echo "Moving CloudFormation Templates to $template_dist_dir"
echo "------------------------------------------------------------------------------"
cp $template_dir/*.template $template_dist_dir/
cp $template_dir/*.yaml $template_dist_dir/
cd $template_dist_dir
# Rename all *.yaml to *.template
for f in *.yaml; do 
    mv -- "$f" "${f%.yaml}.template"
done

cd $template_dir

echo "Updating code source bucket in template with $1"
replace="s/CODE_BUCKET/$1/g"
echo "sed -i -e $replace $template_dist_dir/*.template"
sed -i '' -e $replace $template_dist_dir/*.template
replace="s/SOLUTION_NAME/$2/g"
echo "sed -i -e $replace $template_dist_dir/*.template"
sed -i '' -e $replace $template_dist_dir/*.template
replace="s/SOLUTION_VERSION/$3/g"
echo "sed -i -e $replace $template_dist_dir/*.template"
sed -i '' -e $replace $template_dist_dir/*.template

echo "------------------------------------------------------------------------------"
echo "[Move] Nested templates to $build_dist_dir"
echo "------------------------------------------------------------------------------"
cp $template_dist_dir/multi-region-application-architecture-*.template $build_dist_dir/

echo "------------------------------------------------------------------------------"
echo "Creating Object Store Layer Lambda Package"
echo "------------------------------------------------------------------------------"
cd $source_dir/object-store-layer/custom-resource
rm -rf node_modules/
npm install --production
rm package-lock.json
zip -q -r9 $build_dist_dir/object-store-layer-custom-resource.zip *

echo "------------------------------------------------------------------------------"
echo "Creating Object Store Layer UUID Creator Lambda Package"
echo "------------------------------------------------------------------------------"
cd $source_dir/object-store-layer/uuid-creator
rm -rf node_modules/
npm install --production
rm package-lock.json
zip -q -r9 $build_dist_dir/object-store-layer-uuid-creator.zip *

echo "------------------------------------------------------------------------------"
echo "Creating Key Value Store Layer Lambda Package"
echo "------------------------------------------------------------------------------"
cd $source_dir/key-value-store-layer/custom-resource
rm -rf node_modules/
npm install --production
rm package-lock.json
zip -q -r9 $build_dist_dir/key-value-store-layer-custom-resource.zip *

echo "------------------------------------------------------------------------------"
echo "Creating Serverless App Layer Lambda Package"
echo "------------------------------------------------------------------------------"
cd $source_dir/serverless-app-layer/custom-resource
rm -rf node_modules/
npm install --production
rm package-lock.json
zip -q -r9 $build_dist_dir/serverless-app-layer-custom-resource.zip *

echo "------------------------------------------------------------------------------"
echo "Creating Web App Lambda Package"
echo "------------------------------------------------------------------------------"
cd $source_dir/web-app/custom-resource
rm -rf node_modules/
npm install --production
rm package-lock.json
zip -q -r9 $build_dist_dir/web-app-custom-resource.zip *

echo "------------------------------------------------------------------------------"
echo "Creating Web App Layer Lambda Package"
echo "------------------------------------------------------------------------------"
cd $source_dir/web-app-layer/custom-resource
rm -rf node_modules/
npm install --production
rm package-lock.json
zip -q -r9 $build_dist_dir/web-app-layer-custom-resource.zip *

echo "------------------------------------------------------------------------------"
echo "Building Web App Console"
echo "------------------------------------------------------------------------------"
cd $source_dir/web-app/console
[ -e build ] && rm -r build
[ -e node_modules ] && rm -rf node_modules
npm install
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