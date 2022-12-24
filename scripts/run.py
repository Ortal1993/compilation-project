#!/usr/bin/env python3


import argparse
import shutil
import os
import subprocess
import sys


def parse_args():
    ap = argparse.ArgumentParser()

    ap.add_argument('-n', '--no-build', dest='build', action='store_false', default=True,
                    help='Skip build stage')
    ap.add_argument('-s', '--sample', dest='samples', nargs='+',
                    help='Run the analyzer on sample with index <SAMPLE> (default: do not run anything)')
    ap.add_argument('-i', '--input', dest='inputs', nargs='+',
                    help='Run the analyzer on input file named <INPUT> (default: do not run anything)')
    ap.add_argument('-o', '--output', dest='output', default='graph.txt',
                    help='Save the graph inside file named <OUTPUT> (default: graph.txt)')
    ap.add_argument('-v', '--verbose', dest='verbose', action='store_true', default=False,
                    help='Print logs and output results')
    ap.add_argument('-c', '--clean', dest='clean', action='store_true', default=False,
                    help='Before building, remove build and output directories')
    ap.add_argument('-t', '--test', dest='test', action='store_true', default=False,
                    help=argparse.SUPPRESS)
    ap.add_argument('-u', '--update-goldens', dest='update_goldens', action='store_true', default=False,
                    help=argparse.SUPPRESS)

    return ap.parse_args()


class Log:
    _DEFAULT_EXIT_CODE = 1

    def __init__(self):
        self.info_prefix = 'INFO:'
        self.error_prefix = 'ERROR:'
        self.command_prefix = '>>'

    def info(self, msg):
        print(self.info_prefix, msg)

    def error(self, msg, exit_code=_DEFAULT_EXIT_CODE):
        print(self.error_prefix, msg)
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
        self.tests_dir = os.path.join(self.root_dir, 'tests')
        self.samples_dir = os.path.join(self.tests_dir, 'samples')
        self.goldens_dir = os.path.join(self.tests_dir, 'goldens')


class Config:
    def __init__(self, args):
        self.build = args.build
        self.samples = args.samples
        self.inputs = args.inputs
        self.output = args.output
        self.verbose = args.verbose
        self.clean = args.clean
        self.paths = Paths()


class Stages:
    def __init__(self, args):
        self.cfg = Config(args)
        self.log = Log()

    def clean(self):
        if self.cfg.clean:
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


    def build(self):
        if not self.cfg.build:
            if self.cfg.verbose:
                self.log.info('Skipping build stage')
            return

        compiler = 'tsc'
        sources = self._collect_sources()
        output_dir_flag = ['--outDir', self.cfg.paths.build_dir]
        build_cmd = [compiler] + sources + output_dir_flag

        if self.cfg.verbose:
            self.log.command('Running build command', ' '.join(build_cmd))

        try:
            subprocess.run(build_cmd, check=True)
        except subprocess.CalledProcessError as e:
            self.log.error('Build failed', e.returncode)
        else:
            if self.cfg.verbose:
                self.log.info('Build finished successfully')

    def run(self):
        input_files = self._collect_inputs()

        if not input_files:
            if self.cfg.verbose:
                self.log.info('No samples or inputs were specified')
            return
        elif not os.path.isdir(self.cfg.paths.build_dir):
            self.log.error('Build directory does not exist')

        self._create_output_directory()

        node = 'node'
        entry_point_file = os.path.join(self.cfg.paths.build_dir, 'main.js')
        output_file = os.path.join(self.cfg.paths.output_dir, self.cfg.output)
        run_cmd = [node, entry_point_file, output_file] + input_files

        if self.cfg.verbose:
            self.log.command('Running analyzer', ' '.join(run_cmd))

        try:
            subprocess.run(run_cmd, check=True)
        except subprocess.CalledProcessError as e:
            self.log.error('Analyzer failed', e.returncode)
        else:
            if self.cfg.verbose:
                self.log.info('Analyzer finished successfully')
                self.log.info(f'Output path: {output_file}')

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
        input_files = []

        if self.cfg.verbose:
            self.log.info('Collecting input files')

        self._collect_samples(input_files)

        if self.cfg.inputs is not None:
            for input_file in self.cfg.inputs:
                input_path = os.path.realpath(input_file)
                if not os.path.isfile(input_path):
                    self.log.error(f'Input file {input_path} does not exist')
                input_files.append(input_path)

        return input_files

    def _collect_samples(self, input_files):
        if self.cfg.samples is not None:
            for sample_index in self.cfg.samples:
                if not sample_index.isdecimal():
                    self.log.error('All provided samples must be numbers')
                found = False
                for sample_name in os.listdir(self.cfg.paths.samples_dir):
                    sample_file = os.path.join(self.cfg.paths.samples_dir, sample_name)
                    if sample_name.startswith(f'sample_{sample_index}_'):
                        found = True
                        input_files.append(sample_file)
                        break
                if not found:
                    self.log.error(f'Sample with index {sample_index} does not exist')

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
    stages.build()
    stages.run()


if __name__ == '__main__':
    main()
