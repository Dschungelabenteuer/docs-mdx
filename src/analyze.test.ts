import { dedent } from 'ts-dedent';
import { analyze, extractImports } from './analyze';

import { parse } from '@babel/parser';

export const babelParse = (code: string) =>
  parse(code, {
    sourceType: 'module',
  });

describe('extractImports', () => {
  const ast = babelParse(dedent`
    import { Meta } from '@storybook/blocks';
    import * as ButtonStories from './Button.stories';
  `);
  expect(extractImports(ast)).toMatchInlineSnapshot(`
    Object {
      "ButtonStories": "./Button.stories",
      "Meta": "@storybook/blocks",
    }
  `);
});

describe('analyze', () => {
  describe('title', () => {
    it('string literal title', () => {
      const input = dedent`
        # hello
  
        <Meta title="foobar" />
      `;
      expect(analyze(input)).toMatchInlineSnapshot(`
Object {
  "imports": Array [],
  "isTemplate": false,
  "name": undefined,
  "of": undefined,
  "title": "foobar",
}
`);
    });

    it('template literal title', () => {
      const input = dedent`
        # hello
  
        <Meta title={\`foobar\`} />
      `;
      expect(() => analyze(input)).toThrowErrorMatchingInlineSnapshot(
        `"Expected string literal title, received JSXExpressionContainer"`
      );
    });
  });

  describe('name', () => {
    it('string literal name', () => {
      const input = dedent`
        # hello
  
        <Meta name="foobar" />
      `;
      expect(analyze(input)).toMatchInlineSnapshot(`
Object {
  "imports": Array [],
  "isTemplate": false,
  "name": "foobar",
  "of": undefined,
  "title": undefined,
}
`);
    });
    it('template literal name', () => {
      const input = dedent`
        # hello
  
        <Meta name={\`foobar\`} />
      `;
      expect(() => analyze(input)).toThrowErrorMatchingInlineSnapshot(
        `"Expected string literal name, received JSXExpressionContainer"`
      );
    });
  });

  describe('of', () => {
    it('basic', () => {
      const input = dedent`
        import { Meta } from '@storybook/blocks';
        import * as ButtonStories from './Button.stories';

        <Meta of={ButtonStories} />
      `;
      expect(analyze(input)).toMatchInlineSnapshot(`
Object {
  "imports": Array [
    "@storybook/blocks",
    "./Button.stories",
  ],
  "isTemplate": false,
  "name": undefined,
  "of": "./Button.stories",
  "title": undefined,
}
`);
    });
    it('missing variable', () => {
      const input = dedent`
        <Meta of={meta} />
      `;
      expect(() => analyze(input)).toThrowErrorMatchingInlineSnapshot(`"Unknown identifier meta"`);
    });
    it('string literal', () => {
      const input = dedent`
        import * as ButtonStories from './Button.stories';
  
        <Meta of="foobar" />
      `;
      expect(() => analyze(input)).toThrowErrorMatchingInlineSnapshot(
        `"Expected JSX expression, received StringLiteral"`
      );
    });
  });

  describe('isTemplate', () => {
    it('boolean implicit', () => {
      const input = dedent`
        <Meta isTemplate />
      `;
      expect(analyze(input)).toMatchInlineSnapshot(`
Object {
  "imports": Array [],
  "isTemplate": true,
  "name": undefined,
  "of": undefined,
  "title": undefined,
}
`);
    });

    // For some reason these two tests throw with:
    //   "TypeError: this[node.value.type] is not a function"
    // It's not clear why?
    it('boolean expression, true', () => {
      const input = dedent`
        <Meta isTemplate={true} />
      `;
      expect(analyze(input)).toMatchInlineSnapshot(`
Object {
  "imports": Array [],
  "isTemplate": true,
  "name": undefined,
  "of": undefined,
  "title": undefined,
}
`);
    });

    it('boolean expression, false', () => {
      const input = dedent`
        <Meta isTemplate={false} />
      `;
      expect(analyze(input)).toMatchInlineSnapshot(`
Object {
  "imports": Array [],
  "isTemplate": false,
  "name": undefined,
  "of": undefined,
  "title": undefined,
}
`);
    });

    it('string literal', () => {
      const input = dedent`
        <Meta isTemplate="foo" />
      `;
      expect(() => analyze(input)).toThrowErrorMatchingInlineSnapshot(
        `"Expected JSX expression isTemplate, received StringLiteral"`
      );
    });

    it('other expression', () => {
      const input = dedent`
        <Meta isTemplate={1} />
      `;
      expect(() => analyze(input)).toThrowErrorMatchingInlineSnapshot(
        `"Expected boolean isTemplate, received NumericLiteral"`
      );
    });
  });

  describe('errors', () => {
    it('no title', () => {
      const input = dedent`
      # hello
    `;
      expect(analyze(input)).toMatchInlineSnapshot(`
Object {
  "imports": Array [],
  "isTemplate": false,
  "name": undefined,
  "of": undefined,
  "title": undefined,
}
`);
    });
    it('Bad MDX formatting', () => {
      const input = dedent`
      import * as ButtonStories from './Button.stories';

      <Meta of={ButtonStories} />/>
    `;
      expect(analyze(input)).toMatchInlineSnapshot(`
Object {
  "imports": Array [
    "./Button.stories",
  ],
  "isTemplate": false,
  "name": undefined,
  "of": undefined,
  "title": undefined,
}
`);
    });

    it('duplicate meta, both title', () => {
      const input = dedent`
        <Meta title="foobar" />
  
        <Meta title="bz" />
      `;
      expect(() => analyze(input)).toThrowErrorMatchingInlineSnapshot(
        `"Meta can only be declared once"`
      );
    });

    it('duplicate meta, different', () => {
      const input = dedent`
        import * as ButtonStories from './Button.stories';

        <Meta title="foobar" />
  
        <Meta of={ButtonStories} />
      `;
      expect(() => analyze(input)).toThrowErrorMatchingInlineSnapshot(
        `"Meta can only be declared once"`
      );
    });
  });
});
