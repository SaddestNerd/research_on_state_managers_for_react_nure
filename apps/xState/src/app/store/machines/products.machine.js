import { setup, assign, fromPromise } from 'xstate'
import ProductsService from '../../api/axios/requests/products/products.service'

export const productsMachine = setup({
  actors: {
    fetchProducts: fromPromise(async ({ input }) => {
      const response = await ProductsService.getProducts(input)
      return response.data
    }),
    fetchProductById: fromPromise(async ({ input }) => {
      const response = await ProductsService.getProductById(input.id)
      return response.data
    }),
  },
}).createMachine({
  id: 'products',
  initial: 'idle',
  context: {
    products: [],
    currentProduct: null,
    pagination: {
      offset: 0,
      limit: 10,
      total: 0,
      currentPage: 1,
    },
    error: null,
    loading: false,
    request: { offset: 0, limit: 10 },
  },
  states: {
    idle: {
      on: {
        GET_PRODUCTS: {
          target: 'loading',
        },
        GET_PRODUCT_BY_ID: {
          target: 'loadingProduct',
        },
      },
    },
    loading: {
      // the done event of an invoked actor carries no input, so the requested
      // page is kept in the context
      entry: assign(({ event }) => ({
        loading: true,
        error: null,
        request: { offset: event.offset ?? 0, limit: event.limit ?? 10 },
      })),
      invoke: {
        id: 'fetchProducts',
        src: 'fetchProducts',
        input: ({ context }) => context.request,
        onDone: {
          target: 'loaded',
          actions: [
            assign({
              products: ({ event }) => event.output,
              pagination: ({ context, event }) => ({
                offset: context.request.offset,
                limit: context.request.limit,
                total: event.output.length,
                currentPage: Math.floor(context.request.offset / context.request.limit) + 1,
              }),
              loading: false,
            }),
          ],
        },
        onError: {
          target: 'error',
          actions: [
            assign({
              error: ({ event }) =>
                event.error?.response?.data?.message || 'Помилка завантаження товарів',
              products: [],
              loading: false,
            }),
          ],
        },
      },
    },
    loadingProduct: {
      entry: assign({ loading: true, error: null }),
      invoke: {
        id: 'fetchProductById',
        src: 'fetchProductById',
        input: ({ event }) => ({
          id: event.id,
        }),
        onDone: {
          target: 'idle',
          actions: [
            assign({
              currentProduct: ({ event }) => event.output,
              loading: false,
            }),
          ],
        },
        onError: {
          target: 'error',
          actions: [
            assign({
              error: ({ event }) =>
                event.error?.response?.data?.message || 'Помилка завантаження товару',
              currentProduct: null,
              loading: false,
            }),
          ],
        },
      },
    },
    loaded: {
      on: {
        GET_PRODUCTS: {
          target: 'loading',
        },
        GET_PRODUCT_BY_ID: {
          target: 'loadingProduct',
        },
      },
    },
    error: {
      on: {
        GET_PRODUCTS: {
          target: 'loading',
        },
        GET_PRODUCT_BY_ID: {
          target: 'loadingProduct',
        },
      },
    },
  },
  on: {
    RESET: {
      target: '.idle',
      actions: [
        assign({
          products: [],
          currentProduct: null,
          error: null,
          pagination: {
            offset: 0,
            limit: 10,
            total: 0,
            currentPage: 1,
          },
          loading: false,
        }),
      ],
    },
    CLEAR_ERROR: {
      actions: [assign({ error: null })],
    },
    UPDATE_PAGINATION: {
      actions: [
        assign({
          pagination: ({ context, event }) => ({
            ...context.pagination,
            ...event.pagination,
          }),
        }),
      ],
    },
  },
})

