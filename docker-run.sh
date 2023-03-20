v_tag=$(git tag)
if [ ! $v_tag ]; then
    echo '运行docker镜像需要知道git标签，但当前版本没有设置！'
    exit 0
fi

echo '正在停止my-worksite容器...'
docker stop my-worksite
sleep 5

echo '正在删除my-worksite容器...'
docker rm my-worksite
sleep 5

echo '正在创建my-worksite容器...'
docker run -itd --name my-worksite --link mysql -p 23001:3000 my-worksite:$v_tag