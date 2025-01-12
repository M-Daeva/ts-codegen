import { pascal } from "case";
import { header } from '../utils/header';
import { join } from "path";
import { sync as mkdirp } from "mkdirp";
import * as t from '@babel/types';
import { writeFileSync } from 'fs';
import generate from "@babel/generator";
import { clean } from "../utils/clean";
import { findAndParseTypes, findExecuteMsg } from '../utils';
import { ContractInfo, RenderContext, TSTypesOptions } from "wasm-ast-types";
import { BuilderFile } from "../builder";

export default async (
  name: string,
  contractInfo: ContractInfo,
  outPath: string,
  tsTypesOptions?: TSTypesOptions
): Promise<BuilderFile[]> => {

  const { schemas } = contractInfo;
  const context = new RenderContext(contractInfo, {
    types: tsTypesOptions ?? {}
  });
  const options = context.options.types;

  const localname = pascal(name) + '.types.ts';
  const ExecuteMsg = findExecuteMsg(schemas);
  const typeHash = await findAndParseTypes(schemas);

  const body = [];

  // TYPES
  Object.values(typeHash).forEach((type: t.Node) => {
    body.push(
      clean(type)
    )
  });

  // alias the ExecuteMsg
  if (options.aliasExecuteMsg && ExecuteMsg) {
    body.push(
      t.exportNamedDeclaration(
        t.tsTypeAliasDeclaration(
          t.identifier(`${name}ExecuteMsg`),
          null,
          t.tsTypeReference(t.identifier('ExecuteMsg'))
        )
      )
    );
  }

  const imports = context.getImports();
  const code = header + generate(
    t.program([
      ...imports,
      ...body
    ])
  ).code;

  mkdirp(outPath);
  const filename = join(outPath, localname);
  writeFileSync(filename, code);

  return [
    {
      type: 'type',
      contract: name,
      localname,
      filename,
    }
  ]
};
