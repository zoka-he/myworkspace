v_tag=$(git log -1 --decorate=short --oneline|grep -Eo 'tag: (.*)[,)]+'|awk '{print $2}'|sed 's/)//g'|sed 's/,//g')
if [ ! $v_tag ]; then
    v_tag=latest
fi

echo '正在停止my-worksite容器...'
docker stop my-worksite
sleep 5

echo '正在删除my-worksite容器...'
docker rm my-worksite
sleep 5

echo '正在创建my-worksite容器...'
docker run -itd --name my-worksite --link mysql -p 23001:3000 my-worksite:$v_tag