import { getNacosConfigClient, initNacosClient } from '@/src/server/nacos/client';
import { reconfigureMysqlPools } from '@/src/utils/mysql/server/pool';
import { parseProperties, getScopedProperties } from './properties';

type RuntimeSection = 'mysql' | 'chroma' | 'stomp';

interface RuntimeSnapshot {
  mysqlHash: string;
  chromaHash: string;
  stompHash: string;
}

type ValidationIssue = {
  key: string;
  reason: string;
};

// 注释默认值兜底，显式暴露配置问题（缺失即报错）
const DEFAULT_GROUP = process.env.NACOS_CONFIG_GROUP;
const DEFAULT_DATA_ID = process.env.NACOS_RUNTIME_DATA_ID || 'myworksite.app.core.properties';

class RuntimeConfigCenter {
  private inited = false;
  private subscribing = false;
  private snapshot: RuntimeSnapshot = {
    mysqlHash: '',
    chromaHash: '',
    stompHash: '',
  };

  async init() {
    if (this.inited) return;

    await initNacosClient();
    const client = getNacosConfigClient();
    if (!client) {
      throw new Error('Nacos config client is not ready');
    }

    const dataId = process.env.NACOS_RUNTIME_DATA_ID || DEFAULT_DATA_ID;
    const group = process.env.NACOS_CONFIG_GROUP || DEFAULT_GROUP;
    if (!dataId || !group) {
      throw new Error('Nacos runtime config requires NACOS_RUNTIME_DATA_ID and NACOS_CONFIG_GROUP');
    }
    const content = (await client.getConfig(dataId, group)) || '';
    if (!content.trim()) {
      throw new Error(`Nacos runtime config is empty: dataId=${dataId}, group=${group}`);
    }
    await this.applyFromProperties(content, true);
    this.ensureSubscribed();
    this.inited = true;
  }

  private ensureSubscribed() {
    if (this.subscribing) return;
    const client = getNacosConfigClient();
    if (!client) return;

    const dataId = process.env.NACOS_RUNTIME_DATA_ID || DEFAULT_DATA_ID;
    const group = process.env.NACOS_CONFIG_GROUP || DEFAULT_GROUP;
    if (!dataId || !group) return;

    this.subscribing = true;
    client.subscribe({ dataId, group }, async (content: string) => {
      try {
        await this.applyFromProperties(content || '', false);
      } catch (error) {
        console.error('[RuntimeConfig] Failed to apply hot update:', error);
      }
    });
  }

  private async applyFromProperties(content: string, isBoot: boolean) {
    const all = parseProperties(content);
    const mysqlProps = getScopedProperties(all, 'mysql');
    const chromaProps = getScopedProperties(all, 'chroma');
    const stompProps = getScopedProperties(all, 'stomp');

    const issues = validateProperties({ mysqlProps, chromaProps, stompProps });
    if (issues.length > 0) {
      const detail = issues.map((item) => `${item.key}(${item.reason})`).join(', ');
      throw new Error(`[RuntimeConfig] Invalid properties: ${detail}`);
    }

    await this.applySection('mysql', mysqlProps, isBoot);
    await this.applySection('chroma', chromaProps, isBoot);
    await this.applySection('stomp', stompProps, isBoot);
  }

  private async applySection(section: RuntimeSection, props: Record<string, string>, isBoot: boolean) {
    const hash = JSON.stringify(props);
    const hashKey = `${section}Hash` as keyof RuntimeSnapshot;
    if (!isBoot && this.snapshot[hashKey] === hash) return;

    if (section === 'mysql') {
      await this.applyMysql(props);
    } else if (section === 'chroma') {
      await this.applyChroma(props);
    } else if (section === 'stomp') {
      this.applyStomp(props);
    }

    this.snapshot[hashKey] = hash;
  }

  private async applyMysql(props: Record<string, string>) {
    const host = must(props.host, 'mysql.host');
    const port = mustNumber(props.port, 'mysql.port');
    const user = must(props.user, 'mysql.user');
    const password = must(props.password, 'mysql.password');
    const database = must(props.database, 'mysql.database');
    const databaseNovel = must(props.database_novel, 'mysql.database_novel');
    const connectionLimit = optionalNumber(props.connection_limit, 30);
    const timezone = props.timezone || 'Asia/Shanghai';

    process.env.MYSQL_HOST = host;
    process.env.MYSQL_PORT = String(port);
    process.env.MYSQL_USER = user;
    process.env.MYSQL_PASSWORD = password;
    process.env.MYSQL_DATABASE = database;
    process.env.MYSQL_DATABASE_NOVEL = databaseNovel;

    await reconfigureMysqlPools({
      host,
      port,
      user,
      password: password || '',
      database,
      databaseNovel,
      connectionLimit,
      timezone,
    });
  }

  private async applyChroma(props: Record<string, string>) {
    const chromaUrl = must(props.url, 'chroma.url');
    process.env.CHROMA_URL = chromaUrl;
    const mod = await import('@/src/server/chroma');
    if (typeof mod.reconfigureChromaService === 'function') {
      await mod.reconfigureChromaService(chromaUrl);
    }
  }

  private applyStomp(props: Record<string, string>) {
    const frontendUrl = props.frontend_url ?? '';
    const backendUrl = props.backend_url ?? '';
    const host = props.host || '';
    const port = props.port || '';
    const user = must(props.user, 'stomp.user');
    const passwd = must(props.passwd || props.password, 'stomp.passwd');
    const vhost = props.vhost || '/';

    process.env.RABBITMQ_STOMP_FRONTEND_URL = frontendUrl;
    process.env.RABBITMQ_STOMP_BACKEND_URL = backendUrl;
    process.env.RABBITMQ_STOMP_HOST = host;
    process.env.RABBITMQ_STOMP_PORT = port;
    if (user) process.env.RABBITMQ_STOMP_USER = user;
    if (passwd) process.env.RABBITMQ_STOMP_PASSWD = passwd;
    process.env.RABBITMQ_STOMP_VHOST = vhost;

    // 如果给了 backend_url，则兼容拆分 host/port 给现有 AMQP/STOMP 代码继续使用
    if (backendUrl) {
      try {
        const parsed = new URL(backendUrl);
        process.env.RABBITMQ_STOMP_HOST = parsed.hostname;
        if (parsed.port) {
          process.env.RABBITMQ_STOMP_PORT = parsed.port;
        }
      } catch {
        // ignore invalid URL and keep original host/port
      }
    }
  }
}

function optionalNumber(value: string | undefined, fallback: number) {
  if (value == null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function must(value: string | undefined, key: string) {
  if (value == null || value.trim() === '') {
    throw new Error(`Missing required property: ${key}`);
  }
  return value;
}

function mustNumber(value: string | undefined, key: string) {
  const raw = must(value, key);
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number property: ${key}=${raw}`);
  }
  return parsed;
}

function validateProperties(input: {
  mysqlProps: Record<string, string>;
  chromaProps: Record<string, string>;
  stompProps: Record<string, string>;
}) {
  const issues: ValidationIssue[] = [];
  const { mysqlProps, chromaProps, stompProps } = input;

  validateRequired(mysqlProps, 'host', 'mysql.host', issues);
  validateRequired(mysqlProps, 'port', 'mysql.port', issues);
  validateRequired(mysqlProps, 'user', 'mysql.user', issues);
  validateRequired(mysqlProps, 'password', 'mysql.password', issues);
  validateRequired(mysqlProps, 'database', 'mysql.database', issues);
  validateRequired(mysqlProps, 'database_novel', 'mysql.database_novel', issues);
  validateNumber(mysqlProps, 'port', 'mysql.port', issues);

  validateRequired(chromaProps, 'url', 'chroma.url', issues);

  validateRequired(stompProps, 'user', 'stomp.user', issues);
  if (!stompProps.passwd && !stompProps.password) {
    issues.push({ key: 'stomp.passwd', reason: 'missing' });
  }

  return issues;
}

function validateRequired(
  props: Record<string, string>,
  scopedKey: string,
  fullKey: string,
  issues: ValidationIssue[]
) {
  const value = props[scopedKey];
  if (value == null || value.trim() === '') {
    issues.push({ key: fullKey, reason: 'missing' });
  }
}

function validateNumber(
  props: Record<string, string>,
  scopedKey: string,
  fullKey: string,
  issues: ValidationIssue[]
) {
  const value = props[scopedKey];
  if (value == null || value.trim() === '') return;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) {
    issues.push({ key: fullKey, reason: 'not-number' });
  }
}

export const runtimeConfigCenter = new RuntimeConfigCenter();
