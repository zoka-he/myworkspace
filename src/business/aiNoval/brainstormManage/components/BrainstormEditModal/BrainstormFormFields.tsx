import React from 'react';
import { Form, Input, Select, Row, Col } from 'antd';
import { IBrainstorm, IChapter } from '@/src/types/IAiNoval';
import { typeOptions, statusOptions, priorityOptions, categoryOptions } from '../constants';

const { Option } = Select;
const { TextArea } = Input;

interface BrainstormFormFieldsProps {
  brainstorm: IBrainstorm | null;
  brainstormList: IBrainstorm[];
  chapterList?: IChapter[];
}

export default function BrainstormFormFields({ brainstorm, brainstormList, chapterList = [] }: BrainstormFormFieldsProps) {
  return (
    <>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="category" label="内容分类">
            <Select placeholder="请选择内容分类">
              {categoryOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col span={16}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入标题" />
          </Form.Item>
        </Col>
      </Row>

      {/* 条目类型、状态、优先级一行 */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="brainstorm_type" label="条目类型" rules={[{ required: true, message: '请选择条目类型' }]}>
            <Select placeholder="请选择条目类型">
              {typeOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态">
              {statusOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="priority" label="优先级">
            <Select placeholder="请选择优先级">
              {priorityOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      

      <Form.Item name="parent_ids" label="父脑洞（可多选）">
        <Select
          mode="multiple"
          placeholder="选择父脑洞（可选，可多选）"
          allowClear
          showSearch
          filterOption={(input, option) =>
            String(option?.label ?? option?.children ?? '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {brainstormList
            .filter(b => b.id && b.id !== brainstorm?.id) // 排除当前编辑的脑洞，避免循环引用
            .map(b => (
              <Option key={b.id} value={b.id}>
                {b.title}
              </Option>
            ))}
        </Select>
      </Form.Item>

      <Form.Item name="related_chapter_ids" label="关联章节">
        <Select
          mode="multiple"
          placeholder="选择关联章节（可选，供分析/纲要/角色生成时引用）"
          allowClear
          showSearch
          optionFilterProp="label"
          filterOption={(input, option) =>
            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={chapterList.map((ch) => ({
            value: ch.id,
            label: `第 ${ch.chapter_number ?? ch.id} 章 · ${ch.title || '未命名'}`,
          }))}
        />
      </Form.Item>

      <Form.Item name="tags" label="标签">
        <Select
          mode="tags"
          placeholder="输入标签后按回车添加，可输入多个标签"
          style={{ width: '100%' }}
          tokenSeparators={[',', '，']}
        />
      </Form.Item>
    </>
  );
}
