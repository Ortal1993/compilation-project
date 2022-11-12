BUILD_DIR=build
SOURCES_DIR=sources
SAMPLES_DIR=samples

rm -rf $BUILD_DIR/*
tsc $SOURCES_DIR/*.ts --outDir $BUILD_DIR 
node $BUILD_DIR/main.js $SAMPLES_DIR/sample$1.ts
