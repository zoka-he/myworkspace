v_tag=$(git log -1 --decorate=short --oneline|grep -Eo 'tag: (.*)[,)]+'|awk '{print $2}'|sed 's/)//g'|sed 's/,//g')
if [ -z "$v_tag" ]; then
    echo '构建docker镜像需要使用git标签，但当前版本没有设置！'
    exit 0
fi

docker build -t my-worksite:$v_tag .

echo '构建完毕'
