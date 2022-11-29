# Define path variables

script_dir="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
root_dir=$(realpath $script_dir/..)
build_dir=$(realpath $root_dir/build)
output_dir=$(realpath $root_dir/output)
sources_dir=$(realpath $root_dir/sources)
samples_dir=$(realpath $root_dir/tests/samples)

# Parse command line arguments

build=true
output=graph.txt
clean=false
verbosity=false

short_opts=n,i:,s:,o:,v,c,h
long_opts=no-build,input:,sample:,output:,verbose,clean,help
opts=$(getopt --options $short_opts --longoptions $long_opts -- "$@")
eval set -- "$opts"

while :
do
    case "$1" in
        -n | --no-build )
            build=false
            shift 1
            ;;
        -i | --input )
            input=$2
            shift 2
            ;;
        -s | --sample )
            sample=$2
            shift 2
            ;;
        -o | --output )
            output=$2
            shift 2
            ;;
        -v | --verbose )
            verbosity=true
            shift 1
            ;;
        -c | --clean )
            clean=true
            shift 1
            ;;
        -h | --help )
            echo "Usage: npm run start -- [options]

options:
    -n | --no-build
        Skip build stage
    -i | --input INPUT
        Run the analyzer on input file named <INPUT> (default: do not run anything)
    -s | --sample SAMPLE
        Run the analyzer on sample with index <SAMPLE> (default: do not run anything)
    -o | --output OUTPUT
        Save the graph inside file named <OUTPUT> (default: graph.txt)
    -v | --verbose
        Print logs and output results
    -c | --clean
        Before building, remove build and output directories
    -h | --help
        Show this help message and exit"
            exit 0
            ;;
        -- )
            shift;
            break
            ;;
    esac
done

# Remove build and output directories from previous runs

if [ $clean = true ]
then
    if [ $verbosity = true ]
    then
        echo "INFO: Removing build directory"
        echo ">> rm -rf $build_dir"
    fi

    rm -rf $build_dir

    if [ $? -ne 0 ]
    then
        echo "ERROR: Failed to remove existing build directory"
        exit 1
    fi

    if [ $verbosity = true ]
    then
        echo "INFO: Removing output directory"
        echo ">> rm -rf $output_dir"
    fi

    rm -rf $output_dir

    if [ $? -ne 0 ]
    then
        echo "ERROR: Failed to remove existing output directory"
        exit 1
    fi
fi

# Build stage

if [ $build = false ]
then
    if [ $verbosity = true ]
    then
        echo "INFO: Skipping build stage"
    fi

    if [ ! -d "$build_dir" ]
    then
        echo "ERROR: Build directory does not exist"
        exit 1
    fi
else
    if [ $verbosity = true ]
    then
        echo "INFO: Running build command"
        echo ">> tsc $sources_dir/*.ts --outDir $build_dir"
    fi

    tsc $sources_dir/*.ts --outDir $build_dir

    if [ $? -ne 0 ]
    then
        echo "ERROR: Build failed"
        exit 1
    else
        if [ $verbosity = true ]
        then
            echo "INFO: Build finished successfully"
        fi
    fi
fi

# Run stage

if [ ! -z $sample ] || [ ! -z $input ]
then
    if [ ! -z $input ]
    then
        input_path=$(realpath $input)
        if [ -z $input_path ] || [ ! -e $input_path ]
        then
            echo "ERROR: Could not find input file $input"
            exit 1
        fi
    else
        input_path=$(find $samples_dir -name sample_$sample\_*.ts)
        if [ -z $input_path ] || [ ! -e $input_path ]
        then
            echo "ERROR: Could not find sample file with index $sample"
            exit 1
        fi
    fi

    if [ $verbosity = true ]
    then
        echo "INFO: Creating output directory"
        echo ">> mkdir -p $output_dir"
    fi

    mkdir -p $output_dir

    if [ $? -ne 0 ]
    then
        echo "ERROR: Failed to create output directory"
        exit 1
    fi

    if [ $verbosity = true ]
    then
        echo "INFO: Running analyzer"
        echo ">> node $build_dir/main.js $output_dir/$output $input_path"
    fi

    node $build_dir/main.js $output_dir/$output $input_path

    if [ $? -ne 0 ]
    then
        echo "ERROR: Analyzer failed"
        exit 1
    else
        if [ $verbosity = true ]
        then
            echo "INFO: Analyzer finished successfully"
            echo "INFO: Graph output path: $output_dir/$output"
        fi
    fi
else
    if [ $verbosity = true ]
    then
        echo "INFO: No sample or input were specified"
    fi
fi

exit 0