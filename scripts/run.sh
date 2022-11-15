# Define path variables

script_dir="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
root_dir=$(realpath $script_dir/..)
build_dir=$(realpath $root_dir/build)
output_dir=$(realpath $root_dir/output)
sources_dir=$(realpath $root_dir/sources)
samples_dir=$(realpath $root_dir/tests/samples)

# Parse command line arguments

sample=0
build=true
graph_output=graph.txt
clean=false
verbosity=false

short_opts=n,s:,g:,c,v,h
long_opts=no-build,sample:,graph-output:,clean,verbose,help
opts=$(getopt --options $short_opts --longoptions $long_opts -- "$@")
eval set -- "$opts"

while :
do
    case "$1" in
        -n | --no-build )
            build=false
            shift 1
            ;;
        -s | --sample )
            sample=$2
            shift 2
            ;;
        -g | --graph-output )
            graph_output=$2
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
            echo "Usage: run.sh [--no-build] [--sample <sample_index>] [--graph-output <path-to-output-graph>] [--clean] [--verbose]"
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
    if [ -d "$build_dir" ]
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
    fi

    # Run tsc command

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

if [ $sample -ne 0 ]
then
    # Find sample path

    sample_path=$(find $samples_dir -name sample_$sample\_*.ts)
    if [ -z $sample_path ] || [ ! -e $sample_path ]
    then
        echo "ERROR: Could not find sample file with index $sample"
        exit 1
    fi

    # Create output directory

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

    # Run node command

    if [ $verbosity = true ]
    then
        echo "INFO: Running analyzer"
        echo ">> node $build_dir/main.js $output_dir/$graph_output $sample_path"
    fi

    node $build_dir/main.js $output_dir/$graph_output $sample_path

    if [ $? -ne 0 ]
    then
        echo "ERROR: Analyzer failed"
        exit 1
    else
        if [ $verbosity = true ]
        then
            echo "INFO: Analyzer finished successfully"
            echo "INFO: Printing output:"
            cat $output_dir/$graph_output
        fi
    fi
else
    if [ $verbosity = true ]
    then
        echo "INFO: No sample was specified"
    fi
fi

exit 0