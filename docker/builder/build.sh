#!/bin/bash  
  
# 获取当前文件的绝对路径  
current_file=$(realpath "$0")  
  
# 进入工程根目录  
cd $(dirname "$current_file")/../..

root_dir=$(pwd)
current_file_dir=$root_dir/docker/builder
  
echo "工程目录是: $root_dir"

docker build -f $current_file_dir/Dockerfile -t my-worksite-builder:latest .

