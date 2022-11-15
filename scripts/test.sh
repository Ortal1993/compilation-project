# Define path variables

script_dir="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
root_dir=$(realpath $script_dir/..)
output_dir=$(realpath $root_dir/output)
tests_dir=$(realpath $root_dir/tests)
samples_dir=$(realpath $tests_dir/samples)
goldens_dir=$(realpath $tests_dir/goldens)

# Build without running any samples

bash $script_dir/run.sh

if [ $? -ne 0 ]
then
    echo "Build failed"
    exit 1
else
    echo "Build finished successfully"
fi

# Run samples

num_of_samples=$(ls $samples_dir | wc -l)

for (( i=1; i<=$num_of_samples; i++ ))
do
    graph_output=graph_$i.txt
    sample_path=$(find $samples_dir -name sample_$i\_*.ts)
    golden_path=$(find $goldens_dir -name graph_$i.txt)

    status=OK

    bash $script_dir/run.sh --no-build --sample $i --graph-output $graph_output

    if [ $? -ne 0 ]
    then
        status=FAILED
    else
        diff $output_dir/$graph_output $golden_path >/dev/null 2>&1
        if [ $? -ne 0 ]
        then
            status=FAILED
        else
            rm -rf $output_dir/$graph_output
        fi
    fi

    echo -e "Sample $i\t\t$status"

done