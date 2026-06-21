---
title: "Einstein Notation"
tags:
  - machine-learning
---

## Einstein Summation Notation

We often want to do complicated matrix or vector operations that require careful manipulation to reduce to a correct output. The most explicit way of doing so would be to loop through each dimension of your ndarray and accumulate the result of each element-wise operation. This however can be very inefficient for a large matrix. The good news is, multiplying high dimensional matrices along specific dimensions need not be painful: enter Einstein notation.

## Equation Strings

We often see things like `np.einsum("i,i->", A, B)` in code that relies heavily on tensor manipulation, e.g. machine learning code. It is a convenient way to express product sums of multi-dimensional tensors or arrays without explicitly writing out the underlying transposes or summations.

Various libraries like [NumPy](https://numpy.org/doc/stable/reference/generated/numpy.einsum.html), [Tensorflow](https://www.tensorflow.org/api_docs/python/tf/einsum), and one of my new favorites [einops](https://cgarciae.github.io/einops/2-einops-for-deep-learning/), enable ways to evaluate summations of tensor products along specified dimensions by just specifying equation strings, which makes parsing 10x easier.

The general conversion to Einstein notation goes something like:
1. Remove the variable names and brackets, keeping only the input sub-indices
2. Replace $ * $ with $,$
3. Drop $ \sum $ symbols
4. Replace $=$ with $->$ symbol and move the output sub-indices to the RHS

## Foundational Usage

Let's start with a simple **dot product** between two vectors $ u $  and $ v $ : $ w = \sum_i u_i * v_i$ is written explicitly as `sum_i u[i]*v[i]`and in einsum notation: `w=np.einsum("i,i", u, v).`

Now for a **matrix product** $C_{i,k} = \sum_j A{i,j}\cdot B_{j,k}$ ( i.e.  $ A^T B$ ), this translates to `C[i,k] = sum_j A[i, j]* B[j, k].`

So the corresponding einsum string is "ij,jk->ik" and we'd invoke the operation `np.einsum("ij,jk", A, B).`

*Note: this is equivalent to just writing "ij,jk" since when the output indices are not specified, the repeated indices ("j" in this case) are summed.*

The same thing generalizes to **batched matrix multiplication (e.g. np.matmul)**, which is just normal matrix multiplication with an additional dimension on the $0$-th axis that is preserved.

Step by step, $C_{n,i,k} = \sum_j A{n,i,j}\cdot B_{n,j,k}$ can be transformed from $C_[:, i,k] = \sum_j A[:, i,j] * B[:,j,k]$:
1. $nik = \sum_k nij * njk $
2. $nik = \sum_k nij,njk $
3. $nik = nij,njk $
4. "nij,njk->nik"

and we'd simply invoke `np.einsum("nij,njk->nik", A, B).` If we unrolled this computation, it would look something like:

```python
N = A.shape[0]
assert N == B.shape[0]
I,J = A.shape[1:]
assert J == B.shape[1]
K = B.shape[-1]
C = np.zeros([N, I, K])
for n in range(N):
    for i in range(I):
        for k in range(K):
            for j in range(J): # this is the shared dimension
                C[n][i][k] += A[n][i][j] * B[n][j][k]
return C
```

To compute the **trace** of a matrix $ \sum_i A_{i,i}$ :  `np.einsum("ii->", A).`

### from einops import ___

This is a library that has a slightly different notation from NumPy's einsum strings which excludes the commas, but has some handy built-in functions for doing common things when writing neural network training libraries.

*Note: you can backpropagate through all of einops operations!*

Lets use the following matrix to think about the below operations:

n, c, h, w = 10, 32, 64, 128

x = np.random.normal([n, c, h, w])

rearrange: If you've ported PyTorch code to JAX, you've likely had to convert BCHW to BHWC. This can be done simply: `rearrange(x, 'b c h w -> b h w c')`

reduce: If you want to reduce via some operation on some axis: `reduce(x, 'b c h w -> b c')`, the resulting shape is as you'd expect / specified in the einsum string.

rearrange: If you want to take the transpose along two dimensions: `rearrange(x1, 'b c -> c b')`, the resulting shape is as you'd expect / specified in the einsum string.

parse_shape: To confirm and check that each dimension matches as expected: `parse_shape(x_5d, 'b c x y z')` results in `{'b': 10, 'c': 32, 'x': 100, 'y': 10, 'z': 20}`. To skip out on some dims: `parse_shape(x_5d, 'batch c - - -').`

### Common usage patterns

flatten: `rearrange(x, 'b c h w -> b (c h w)') # (10, 32, 100, 200) -> (10, 640000)`

```python
space-to-depth: rearrange(x, 'b c (h h1) (w w1) -> b (h1 w1 c) h w', h1=2, w1=2) # (10, 32, 100, 200) -> (10, 32, 100, 200)
```

global avg pool: `reduce(x, 'b c h w -> b c', reduction='mean') # (10, 32, 100, 200) -> (10, 32)`

max pool w/ kxk kernel: `reduce(x, 'b c (h h1) (w w1) -> b c h w', reduction='max', h1=k1, w1=k2) # (10, 32, 100//k1, 100%k1, 200//k2, 200%k2) -> (10, 32)`

```python
expand_dims: rearrange(x[0, :3], 'c h w -> h w c') # (32, 100, 200) -> (100, 200, 32)
           : rearrange(im, 'h w c -> () c h w') # (100, 200, 32) -> (1, 100, 200, 32)
           : rearrange(preds, 'b c h w -> b (c h w)') # (1, 100, 200, 32) -> (1, 100 * 200 * 32) convnet for classification
           : rearrange(preds, '() class -> class') # (1, n_classes) -> (n_classes,)
keep_dims: reduce(x, 'b c h w -> b c 1 1', 'mean') # (10, 32, 100, 200) -> (10, 32, 1, 1)
concatenate: rearrange(list_of_tensors, 'b c h w -> (b h) w c') # (10, 32, 100, 200) -> (1000, 200, 32) # concatenate over first dim
           : rearrange(list_of_tensors, 'b c h w -> h w (b c)') # (10, 32, 100, 200) -> (100, 200, 320) # concatenate over last dim
stack: rearrange(list_of_tensors, 'b c h w -> h w c b') # (10, 32, 100, 200) -> (100, 200, 32, 10) stack on last dim
shuffling: rearrange(x, 'b (g1 g2 c) h w -> b (g2 g1 c) h w', g1=4, g2=4) # (10, 32, 100, 200) -> (10, 32, 100, 200)
         : rearrange(x, 'b (g c) h w -> b (c g) h w', g=4) # equivalent, simpler than above
split dimensions (unpack): rearrange(x, 'b (coord box) h w -> coord) # -> bbx_x, bbx_y, bbx_w, bbx_h, (10, 8, 100, 200), then operate on individual variables
                         : reduce(bbx_w * bbx_h, 'b bbox h w -> b h w', 'max') # (10, 100, 200)
striding: rearrange(x, 'b c (h hs) (w ws) -> (hs ws b) c h w', hs=2, ws=2) # (10, 32, 50, 2, 100, 2) -> (40, 32, 50, 100), split each image into sub-grids where each is now a separate "image"; apply 2d convolution; re-pack sub-grids into full image same as above swapping -> arrow arguments
```
