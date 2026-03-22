import { useState } from 'react';
import {
  Input, InputNumber, Select, Switch, DatePicker,
  Button, Popover, Space, Tooltip, Form, Popconfirm, Tag,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
  HolderOutlined, FontSizeOutlined, NumberOutlined,
  CalendarOutlined, AlignLeftOutlined, UnorderedListOutlined,
  DollarOutlined, CheckSquareOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { DynamicField, FieldType } from '../../../types';

interface Props {
  fields: DynamicField[];
  onChange: (fields: DynamicField[]) => void;
}

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ReactNode }[] = [
  { value: 'text',     label: 'Teks',       icon: <FontSizeOutlined /> },
  { value: 'textarea', label: 'Paragraf',   icon: <AlignLeftOutlined /> },
  { value: 'number',   label: 'Angka',      icon: <NumberOutlined /> },
  { value: 'currency', label: 'Mata Uang',  icon: <DollarOutlined /> },
  { value: 'date',     label: 'Tanggal',    icon: <CalendarOutlined /> },
  { value: 'select',   label: 'Pilihan',    icon: <UnorderedListOutlined /> },
  { value: 'boolean',  label: 'Ya / Tidak', icon: <CheckSquareOutlined /> },
];

const typeLabel = (t: FieldType) => FIELD_TYPES.find(f => f.value === t)?.label ?? t;

function FieldValueEditor({
  field,
  onChange,
}: {
  field: DynamicField;
  onChange: (value: string) => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
  };

  switch (field.type) {
    case 'textarea':
      return (
        <Input.TextArea
          value={field.value}
          onChange={e => onChange(e.target.value)}
          autoSize={{ minRows: 1, maxRows: 5 }}
          variant="borderless"
          style={inputStyle}
          placeholder="Tulis di sini..."
        />
      );
    case 'number':
      return (
        <InputNumber
          value={field.value ? Number(field.value) : undefined}
          onChange={v => onChange(String(v ?? ''))}
          variant="borderless"
          style={inputStyle}
          placeholder="0"
        />
      );
    case 'currency':
      return (
        <InputNumber
          value={field.value ? Number(field.value) : undefined}
          onChange={v => onChange(String(v ?? ''))}
          variant="borderless"
          style={inputStyle}
          placeholder="0"
          prefix="Rp"
          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={v => v?.replace(/\./g, '') as unknown as number}
        />
      );
    case 'date':
      return (
        <DatePicker
          value={field.value ? dayjs(field.value) : null}
          onChange={d => onChange(d ? d.format('YYYY-MM-DD') : '')}
          variant="borderless"
          style={inputStyle}
          format="DD/MM/YYYY"
          placeholder="Pilih tanggal"
        />
      );
    case 'select':
      return (
        <Select
          value={field.value || undefined}
          onChange={v => onChange(v)}
          variant="borderless"
          style={inputStyle}
          placeholder="Pilih..."
          options={(field.options ?? []).map(o => ({ value: o, label: o }))}
        />
      );
    case 'boolean':
      return (
        <Switch
          checked={field.value === 'true'}
          onChange={v => onChange(String(v))}
          checkedChildren="Ya"
          unCheckedChildren="Tidak"
        />
      );
    default:
      return (
        <Input
          value={field.value}
          onChange={e => onChange(e.target.value)}
          variant="borderless"
          style={inputStyle}
          placeholder="Tulis di sini..."
        />
      );
  }
}

function AddFieldPopover({ onAdd }: { onAdd: (label: string, type: FieldType) => void }) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ label: string; type: FieldType }>();

  const handleAdd = () => {
    form.validateFields().then(({ label, type }) => {
      onAdd(label, type);
      form.resetFields();
      setOpen(false);
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      content={
        <div style={{ width: 280 }}>
          <Form form={form} layout="vertical" size="small">
            <Form.Item label="Label field" name="label" rules={[{ required: true, message: 'Wajib diisi' }]}>
              <Input placeholder="Contoh: Luas Tanah, No. SHM..." autoFocus />
            </Form.Item>
            <Form.Item label="Tipe" name="type" initialValue="text" rules={[{ required: true }]}>
              <Select
                options={FIELD_TYPES.map(t => ({
                  value: t.value,
                  label: <Space>{t.icon} {t.label}</Space>,
                }))}
              />
            </Form.Item>
          </Form>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button size="small" onClick={() => setOpen(false)}>Batal</Button>
            <Button size="small" type="primary" onClick={handleAdd}>Tambah</Button>
          </div>
        </div>
      }
    >
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        size="small"
        style={{ marginTop: 8, color: '#8c8c8c', borderColor: '#d9d9d9' }}
      >
        Tambah Field
      </Button>
    </Popover>
  );
}

export default function DynamicFieldsSection({ fields, onChange }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const updateField = (id: string, changes: Partial<DynamicField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...changes } : f));
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const moveField = (id: string, dir: 'up' | 'down') => {
    const idx = fields.findIndex(f => f.id === id);
    if (idx < 0) return;
    const next = [...fields];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next.map((f, i) => ({ ...f, order: i })));
  };

  const addField = (label: string, type: FieldType) => {
    const newField: DynamicField = {
      id: crypto.randomUUID(),
      label,
      type,
      value: '',
      options: type === 'select' ? [] : undefined,
      order: fields.length,
    };
    onChange([...fields, newField]);
  };

  return (
    <div>
      {fields.map((field, idx) => (
        <div
          key={field.id}
          onMouseEnter={() => setHovered(field.id)}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 4,
            padding: '6px 0',
            borderBottom: '1px solid #f0f0f0',
            transition: 'background 0.1s',
            background: hovered === field.id ? '#fafafa' : 'transparent',
            borderRadius: 4,
          }}
        >
          {/* Drag handle (visual only) */}
          <span style={{ color: '#bfbfbf', paddingTop: 6, cursor: 'grab', opacity: hovered === field.id ? 1 : 0, transition: 'opacity 0.15s' }}>
            <HolderOutlined />
          </span>

          {/* Label */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <Input
              value={field.label}
              onChange={e => updateField(field.id, { label: e.target.value })}
              variant="borderless"
              style={{ fontWeight: 500, color: '#595959', padding: '4px 0' }}
              placeholder="Label..."
            />
            <Tag style={{ fontSize: 10, marginTop: 2, color: '#8c8c8c', background: '#f5f5f5', border: 'none' }}>
              {typeLabel(field.type)}
            </Tag>
          </div>

          {/* Value */}
          <div style={{ flex: 1 }}>
            <FieldValueEditor
              field={field}
              onChange={val => updateField(field.id, { value: val })}
            />
            {/* Options editor for select type */}
            {field.type === 'select' && (
              <Select
                mode="tags"
                size="small"
                value={field.options ?? []}
                onChange={opts => updateField(field.id, { options: opts })}
                style={{ width: '100%', marginTop: 4 }}
                placeholder="Tambah pilihan (tekan Enter)..."
                variant="borderless"
                open={false}
                tokenSeparators={[',']}
              />
            )}
          </div>

          {/* Actions */}
          <Space size={2} style={{ opacity: hovered === field.id ? 1 : 0, transition: 'opacity 0.15s', paddingTop: 4 }}>
            <Tooltip title="Naik">
              <Button
                size="small" type="text" icon={<ArrowUpOutlined />}
                disabled={idx === 0}
                onClick={() => moveField(field.id, 'up')}
              />
            </Tooltip>
            <Tooltip title="Turun">
              <Button
                size="small" type="text" icon={<ArrowDownOutlined />}
                disabled={idx === fields.length - 1}
                onClick={() => moveField(field.id, 'down')}
              />
            </Tooltip>
            <Popconfirm
              title="Hapus field ini?"
              onConfirm={() => removeField(field.id)}
              okText="Ya" cancelText="Tidak"
            >
              <Button size="small" type="text" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </Space>
        </div>
      ))}

      <AddFieldPopover onAdd={addField} />
    </div>
  );
}
