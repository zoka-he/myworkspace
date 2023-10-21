from .mysql_config import mysql_config
import pymysql

def getConn():
    return pymysql.connect(
        host = mysql_config["MYSQL_HOST"],
        user = mysql_config["MYSQL_USER"],
        password = mysql_config["MYSQL_PASSWORD"],
        database = mysql_config["MYSQL_DATABASE"]
    )