#!/usr/bin/env python3


import argparse
import shutil
import os
import subprocess
import sys
import re
import difflib
import re


def parse_args():
    ap = argparse.ArgumentParser()

    ap.add_argument('-n', '--no-build', dest='build_project', action='store_false', default=True,
                    help='Skip build project stage')
    ap.add_argument('-s', '--sample', dest='samples', nargs='+', metavar='SAMPLE',
                    help='Build the graph for the sample with index <SAMPLE> (default: do not build the graph)')
    ap.add_argument('-i', '--input', dest='inputs', nargs='+', metavar='INPUT',
                    help='Build the graph for the input file named <INPUT> (default: do not build the graph)')
    ap.add_argument('-g', '--graph-output', dest='graph_name', default='graph.txt', metavar='GRAPH_NAME',
                    help='Save the graph inside file named <GRAPH_NAME> (default: graph.txt)')
    ap.add_argument('-a', '--analyze', dest='analysis_type', choices=list(Analyzer.get_analysis_types().keys()),
                    help='Run analysis on the graph')
    ap.add_argument('-v', '--verbose', dest='verbose', action='store_true', default=False,
                    help='Print logs and output results')
    ap.add_argument('-c', '--clean', dest='clean', action='store_true', default=False,
                    help='Before building the project, remove the build and output directories')
    ap.add_argument('-t', '--test', dest='test', action='store_true', default=False,
                    help=argparse.SUPPRESS)
    ap.add_argument('-u', '--update-goldens', dest='update_goldens', action='store_true', default=False,
                    help=argparse.SUPPRESS)

    args = ap.parse_args()

    if args.update_goldens:
        args.test = True

    if args.test:
        args.clean = True

    return args


class Format:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    _END = '\033[0m'


class Log:
    _DEFAULT_EXIT_CODE = 1

    def __init__(self):
        self.info_prefix = 'INFO: '
        self.error_prefix = 'ERROR: '
        self.command_prefix = '>>'

    def info(self, msg, new_line=True, prefix=True, format=None):
        full_msg = (f'{self.info_prefix}{msg}') if prefix else msg
        if format is not None:
            full_msg = f'{"".join(format)}{full_msg}{Format._END}'
        print(full_msg, end='\n' if new_line else '')

    def error(self, msg, exit_code=_DEFAULT_EXIT_CODE):
        print(f'{Format.RED}{Format.BOLD}{self.error_prefix}{msg}{Format._END}')
        sys.exit(exit_code)

    def command(self, msg, cmd):
        self.info(msg)
        print(self.command_prefix, cmd)


class Paths:
    def __init__(self):
        self.scripts_dir = os.path.dirname(os.path.realpath(__file__))
        self.root_dir = os.path.dirname(self.scripts_dir)
        self.build_dir = os.path.join(self.root_dir, 'build')
        self.output_dir = os.path.join(self.root_dir, 'output')
        self.sources_dir = os.path.join(self.root_dir, 'sources')
        self.analysis_dir = os.path.join(self.root_dir, 'analysis')
        self.tests_dir = os.path.join(self.root_dir, 'tests')
        self.samples_dir = os.path.join(self.tests_dir, 'samples')
        self.goldens_dir = os.path.join(self.tests_dir, 'goldens')


class Config:
    def __init__(self, args):
        self.build_project = args.build_project
        self.samples = args.samples
        self.inputs = args.inputs
        self.graph_name = args.graph_name
        self.analysis_type = args.analysis_type
        self.verbose = args.verbose
        self.clean = args.clean
        self.test = args.test
        self.update_goldens = args.update_goldens
        self.paths = Paths()

class Analyzer:
    def __init__(self, cfg, log):
        self.cfg = cfg
        self.log = log

    def run(self):
        analysis_types = Analyzer.get_analysis_types()
        analysis_types[self.cfg.analysis_type](self)

    @classmethod
    def get_analysis_types(cls):
        return {
            'array_size': cls._run_array_size_analysis
        }

    def _run_array_size_analysis(self):
        analysis_file = os.path.join(self.cfg.paths.analysis_dir, 'array_size.dl')
        analysis_cmd = [
            'souffle',
            '-F', self.cfg.paths.output_dir,
            '-D', self.cfg.paths.output_dir,
            analysis_file
        ]

        if self.cfg.verbose:
            self.log.command('Running analyzer', ' '.join(analysis_cmd))

        try:
            subprocess.run(analysis_cmd, check=True)
        except subprocess.CalledProcessError as e:
            self.log.error('Analyzer failed', e.returncode)
        else:
            if self.cfg.verbose:
                self.log.info('Analyzer finished successfully', format=[Format.GREEN])

        self._parse_array_size_analysis_output()

    def _parse_array_size_analysis_output(self):
        delta_in_control_output_path = os.path.join(self.cfg.paths.output_dir, 'delta_in_control.csv')
        function_final_delta_output_path = os.path.join(self.cfg.paths.output_dir, 'function_final_delta.csv')
        graph_path = os.path.join(self.cfg.paths.output_dir, self.cfg.graph_name)

        with open(delta_in_control_output_path, 'r') as delta_in_control_output_file:
            delta_in_control_output = delta_in_control_output_file.readlines()

        with open(function_final_delta_output_path, 'r') as function_final_delta_output_file:
            function_final_delta_output = function_final_delta_output_file.readlines()

        with open(graph_path, 'r') as graph_file:
            graph = graph_file.readlines()

        delta_in_control = {}
        for delta_in_control_output_line in delta_in_control_output:
            control_node_id, parameter_node_id, delta = delta_in_control_output_line.strip('\n').split(',')
            if delta == '999':
                delta = 'T'
            delta_in_control.setdefault(control_node_id, [])
            delta_in_control[control_node_id].append((parameter_node_id, delta))

        function_final_delta = {}
        for function_final_delta_output_line in function_final_delta_output:
            function_node_id, parameter_node_id, delta = function_final_delta_output_line.strip('\n').split(',')
            if delta == '999':
                delta = 'T'
            function_final_delta.setdefault(function_node_id, [])
            function_final_delta[function_node_id].append((parameter_node_id, delta))

        for control_node_id, params in delta_in_control.items():
            append_to_label = ''
            for param, delta in params:
                append_to_label += f'\np({param}):d({delta})'
            if control_node_id in function_final_delta:
                append_to_label += '\n--------\nfinal delta'
                for param, delta in function_final_delta[control_node_id]:
                    append_to_label += f'\np({param}):d({delta})'

            for index, graph_line in enumerate(graph):
                pattern = r'\s*(\d+) \[ label="(.+)" shape=".+" \]'
                match = re.match(pattern, graph_line)
                if match is not None and match[1] == control_node_id:
                    current_label = match[2]
                    new_label = current_label + append_to_label
                    graph[index] = graph_line.replace(current_label, new_label)
                    break

        with open(graph_path, 'w') as graph_file:
            graph_file.writelines(graph)

class Stages:
    def __init__(self, args):
        self.cfg = Config(args)
        self.log = Log()

    def clean(self):
        if not self.cfg.clean:
            return

        dirs = [
            (self.cfg.paths.output_dir, 'output'),
            (self.cfg.paths.build_dir, 'build')
        ]
        for dir_path, dir_name in dirs:
            if self.cfg.verbose:
                self.log.info(f'Removing {dir_name} directory')
            if os.path.isdir(dir_path):
                try:
                    shutil.rmtree(dir_path)
                except shutil.Error as e:
                    self.log.error(f'Failed to remove existing {dir_name} directory', e.errno)

    def build_project(self):
        if not self.cfg.build_project and not self.cfg.test:
            if self.cfg.verbose:
                self.log.info('Skipping build stage')
            return

        build_cmd = 'tsc'

        if self.cfg.verbose:
            self.log.command('Running build command', build_cmd)

        try:
            subprocess.run(build_cmd, check=True)
        except subprocess.CalledProcessError as e:
            self.log.error('Build failed', e.returncode)
        else:
            if self.cfg.verbose:
                self.log.info('Build finished successfully', format=[Format.GREEN])

    def build_graph(self):
        if self.cfg.test:
            self._test()
            return

        input_files = self._collect_inputs()

        if not input_files:
            if self.cfg.verbose:
                self.log.info('No samples or inputs were specified')
            return
        elif not os.path.isdir(self.cfg.paths.build_dir):
            self.log.error('Build directory does not exist')

        self._create_output_directory()

        run_cmd = self._get_run_command([input_file for _, input_file in input_files])

        if self.cfg.verbose:
            self.log.command('Building graph', ' '.join(run_cmd))

        try:
            subprocess.run(run_cmd, check=True)
        except subprocess.CalledProcessError as e:
            self.log.error('Building graph failed', e.returncode)
        else:
            if self.cfg.verbose:
                self.log.info('The graph was built successfully', format=[Format.GREEN])

    def analyze(self):
        if self.cfg.analysis_type is None:
            return

        analyzer = Analyzer(self.cfg, self.log)
        analyzer.run()

    def finish(self):
        self.log.info(f'Output files path: {self.cfg.paths.output_dir}', format=[Format.BOLD], prefix=False)

    def _test(self):
        any_failed = False
        any_updated = False

        samples = self._collect_samples()
        samples.sort(key=lambda sample: int(sample[0]))

        self._create_output_directory()

        for index, sample in samples:
            failed, updated = self._run_single_test(index, sample)

            any_failed = any_failed or failed
            any_updated = any_updated or updated

        self._print_test_results(any_updated, any_failed)

    def _run_single_test(self, index, sample):
        PASSED, FAILED, UPDATED, UNTOUCHED = 'PASSED', 'FAILED', 'UPDATED', 'UNTOUCHED'
        failed = False
        updated = False
        self.cfg.graph_name = f'graph_{index}.txt'
        run_cmd = self._get_run_command([sample])

        if self.cfg.verbose:
            self.log.info(f'Running sample {index}', new_line=False)
        try:
            subprocess.run(run_cmd, check=True)
        except subprocess.CalledProcessError as e:
            failed = True
        else:
            if self.cfg.update_goldens:
                updated = self._update_golden(index)
            else:
                failed = self._is_diff(index)

        if not failed:
            os.remove(os.path.join(self.cfg.paths.output_dir, self.cfg.graph_name))

        if self.cfg.verbose:
            if failed:
                self.log.info(f'\t\t{FAILED}', prefix=False, format=[Format.RED])
            if self.cfg.update_goldens:
                if updated:
                    self.log.info(f'\t\t{UPDATED}', prefix=False, format=[Format.YELLOW])
                else:
                    self.log.info(f'\t\t{UNTOUCHED}', prefix=False, format=[Format.GREEN])
            if not failed and not self.cfg.update_goldens:
                self.log.info(f'\t\t{PASSED}', prefix=False, format=[Format.GREEN])

        return failed, updated

    def _print_test_results(self, updated, failed):
        PASSED, FAILED, UPDATED, UNTOUCHED = 'PASSED', 'FAILED', 'UPDATED', 'UNTOUCHED'

        if self.cfg.update_goldens:
            if updated:
                result, format = UPDATED, [Format.YELLOW]
            else:
                result, format = UNTOUCHED, [Format.GREEN]
        else:
            if failed:
                result, format = FAILED, [Format.RED]
            else:
                result, format = PASSED, [Format.GREEN]
        format.append(Format.BOLD)

        self.log.info(f'Result: {result}', prefix=False, format=format)

    def _update_golden(self, index):
        output = os.path.join(self.cfg.paths.output_dir, self.cfg.graph_name)
        golden = os.path.join(self.cfg.paths.goldens_dir, f'graph_{index}.txt')

        if self._is_diff(index):
            try:
                shutil.copy(output, golden)
            except shutil.Error as e:
                self.log.error(f'Failed to updated golden with index {index}', e.errno)
            return True
        return False

    def _is_diff(self, index):
        output = os.path.join(self.cfg.paths.output_dir, self.cfg.graph_name)
        golden = os.path.join(self.cfg.paths.goldens_dir, f'graph_{index}.txt')

        with open(output, 'r') as output_file:
            output_lines = output_file.readlines()
        with open(golden, 'r') as golden_file:
            golden_lines = golden_file.readlines()

        for _ in difflib.unified_diff(output_lines, golden_lines,
                                         fromfile=output, tofile=golden,
                                         lineterm=''):
            return True

        return False

    def _get_run_command(self, input_files):    
        node = 'node'
        entry_point_file = os.path.join(self.cfg.paths.build_dir, 'main.js')
        output_file = os.path.join(self.cfg.paths.output_dir, self.cfg.graph_name)
        return [node, entry_point_file, output_file] + input_files

    def _collect_sources(self):
        sources = []
        self._collect_sources_rec(self.cfg.paths.sources_dir, sources)
        return sources

    def _collect_sources_rec(self, dir_path, sources):
        for curr_name in os.listdir(dir_path):
            curr_path = os.path.join(dir_path, curr_name)
            if os.path.isfile(curr_path):
                sources.append(curr_path)
            elif os.path.isdir(curr_path):
                self._collect_sources_rec(curr_path)

    def _collect_inputs(self):
        if self.cfg.verbose:
            self.log.info('Collecting input files')

        input_files = self._collect_samples()

        if self.cfg.inputs is not None:
            for input_file in self.cfg.inputs:
                input_path = os.path.realpath(input_file)
                if not os.path.isfile(input_path):
                    self.log.error(f'Input file {input_path} does not exist')
                input_files.append((None, input_path))

        return input_files

    def _collect_samples(self):
        samples = []

        if self.cfg.samples is not None:
            for sample_index in self.cfg.samples:
                if not sample_index.isdecimal():
                    self.log.error('All provided samples must be indexes')
                found = False
                for sample_name in os.listdir(self.cfg.paths.samples_dir):
                    sample_file = os.path.join(self.cfg.paths.samples_dir, sample_name)
                    if sample_name.startswith(f'sample_{sample_index}_'):
                        found = True
                        samples.append((sample_index, sample_file))
                        break
                if not found:
                    self.log.error(f'Sample with index {sample_index} does not exist')
        elif self.cfg.test:
            for sample_name in os.listdir(self.cfg.paths.samples_dir):
                [sample_index] = [sample[len('sample_'):] for sample in re.findall(r'sample_[0-9]+', sample_name)]
                sample_file = os.path.join(self.cfg.paths.samples_dir, sample_name)
                samples.append((sample_index, sample_file))

        return samples

    def _create_output_directory(self):
        if self.cfg.verbose:
            self.log.info('Creating output directory')
        try:
            os.makedirs(self.cfg.paths.output_dir, exist_ok=True)
        except OSError as e:
            self.log.error("Failed to create output directory", e.errno)


def main():
    args = parse_args()
    stages = Stages(args)
    stages.clean()
    stages.build_project()
    stages.build_graph()
    stages.analyze()
    stages.finish()


if __name__ == '__main__':
    main()
