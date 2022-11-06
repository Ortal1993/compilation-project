BUILD_DIR=build
SAMPLES_DIR=samples

rm -rf $BUILD_DIR/*
tsc *.ts --outDir $BUILD_DIR
node $BUILD_DIR/main.js $SAMPLES_DIR/sample$1.ts
