const { store } = require(`../../redux`)
const { build, rebuildWithSitePage } = require(`..`)
require(`../../db/__tests__/fixtures/ensure-loki`)()

const firstPage = {
  id: `page1`,
  parent: null,
  children: [],
  internal: { type: `SitePage` },
  keep: `Page`,
  fields: {
    oldKey: `value`,
  },
}

const secondPage = {
  id: `page2`,
  parent: null,
  children: [],
  internal: { type: `SitePage` },
  fields: {
    key: `value`,
  },
  context: {
    key: `value`,
  },
}

const nodes = [firstPage]

describe(`build and update schema`, () => {
  let schema

  beforeAll(async () => {
    store.dispatch({ type: `DELETE_CACHE` })
    nodes.forEach(node =>
      store.dispatch({ type: `CREATE_NODE`, payload: node })
    )

    await build({})
    schema = store.getState().schema
  })

  it(`updates SitePage on rebuild`, async () => {
    let fields
    let inputFields

    const initialFields = [
      `id`,
      `parent`,
      `children`,
      `internal`,
      `keep`,
      `fields`,
    ]

    fields = Object.keys(schema.getType(`SitePage`).getFields())
    expect(fields.length).toBe(6)
    expect(fields).toEqual(initialFields)

    inputFields = Object.keys(schema.getType(`SitePageFilterInput`).getFields())
    expect(fields.length).toBe(6)
    expect(inputFields).toEqual(initialFields)

    // Rebuild Schema
    store.dispatch({ type: `CREATE_NODE`, payload: secondPage })
    await rebuildWithSitePage({})
    schema = store.getState().schema

    fields = Object.keys(schema.getType(`SitePage`).getFields())
    expect(fields.length).toBe(7)
    expect(fields).toEqual(initialFields.concat(`context`))

    inputFields = Object.keys(schema.getType(`SitePageFilterInput`).getFields())
    expect(fields.length).toBe(7)
    expect(inputFields).toEqual(initialFields.concat(`context`))

    const fieldsEnum = schema
      .getType(`SitePageFieldsEnum`)
      .getValue(`context___key`)
    expect(fieldsEnum).toBeDefined()

    const sortFieldsEnum = schema.getType(`SitePageSortInput`).getFields()
      .fields.type.ofType
    expect(sortFieldsEnum.getValue(`context___key`)).toBeDefined()
  })

  // FIXME: This is not a problem as long as the only use of rebuilding the
  // schema to add a `context` field to `SitePage`. But it needs to work
  // if we want to enable on-demand schema regeneration.
  // This currently does not work because we need to invalidate all FilterInput
  // composers on nested types as well. Alternatively, use a local cache
  // in `filter.js` instead of checking `schemaComposer.has()`.
  it.skip(`updates nested types on rebuild`, async () => {
    let fields
    let inputFields

    fields = Object.keys(schema.getType(`SitePageFields`).getFields())
    expect(fields.length).toBe(1)
    expect(fields).toEqual([`oldKey`])
    inputFields = Object.keys(
      schema.getType(`SitePageSitePageFieldsFilterInput`).getFields()
    )
    expect(inputFields.length).toBe(1)
    expect(inputFields).toEqual([`oldKey`])

    // Rebuild Schema
    store.dispatch({ type: `CREATE_NODE`, payload: secondPage })
    await rebuildWithSitePage({})
    schema = store.getState().schema

    fields = Object.keys(schema.getType(`SitePageFields`).getFields())
    expect(fields.length).toBe(2)
    expect(fields).toEqual([`oldKey`, `key`])

    inputFields = Object.keys(
      schema.getType(`SitePageSitePageFieldsFilterInput`).getFields()
    )
    expect(inputFields.length).toBe(2)
    expect(inputFields).toEqual([`oldKey`, `key`])

    const fieldsEnum = schema
      .getType(`SitePageFieldsEnum`)
      .getValues()
      .map(value => value.name)
    expect(fieldsEnum.includes(`fields___oldKey`)).toBeTruthy()
    expect(fieldsEnum.includes(`fields___key`)).toBeTruthy()
  })
})
