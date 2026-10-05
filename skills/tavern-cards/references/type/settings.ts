import * as z from 'zod';
import { TypeLists, Role, StrategyThresholdValue } from './state.js';

const DepthDefaults = z.object({
  role: Role.default('system'),
  depth: z.number().default(0),
});

export const ProjectConfig = z.object({
  state_file: z.string().describe('tavern-cards-state.json 的路径, 相对于 .cardrc.json 目录'),
  artifact: z.string().optional().describe('打包产物路径 (pack 输出 / unpack 输入), 相对于 .cardrc.json 目录'),
});
export type ProjectConfig = z.infer<typeof ProjectConfig>;

export const CardrcConfig = z.object({
  projects: z.record(z.string(), ProjectConfig).default({}),
  default_type_lists: TypeLists.describe('各位置的条目类型默认顺序'),
  default_strategy_thresholds: z.record(z.string(), StrategyThresholdValue).default({})
    .describe('默认策略阈值, "Infinity"=蓝灯, 0=绿灯, >0=条件绿灯, null=禁用'),
  default_part_order: z.record(z.string(), z.array(z.string())).default({})
    .describe('各类型的 part 排序规则'),
  depth_defaults: DepthDefaults.default({ role: 'system', depth: 0 }).describe('at_depth 位置的默认 role/depth'),
});
export type CardrcConfig = z.infer<typeof CardrcConfig>;
