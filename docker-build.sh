v_tag=$(git tag)
if [ ! $v_tag ]; then
    echo '构建docker镜像需要使用git标签，但当前版本没有设置！'
    exit 0
fi

mkdir -p $v_outdir
docker build -t my-worksite:$v_tag .

echo '构建完毕'
