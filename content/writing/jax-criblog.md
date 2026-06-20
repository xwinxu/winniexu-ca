---
title: "JAX Criblog"
tags:
  - machine-learning
---

## Overview

[JAX](https://github.com/google/jax) implements the *Numpy* and *Scipy* APIs, which allows us to do numerical operations on tensor-like arrays. A JAX DeviceArray is essentially this object containing the following:
- *Numpy* value
- *dtype*

Like normally, you can access .*shape* via the object’s attribute.

## import jax

JAX can be executed on most accelerators (CPU/GPU/TPU). Ensure that you install JAX with GPU support and set your CUDA lib path correctly. You should no longer see:

WARNING:absl:No GPU/TPU found, falling back to CPU. (Set TF_CPP_MIN_LOG_LEVEL=0 and rerun for more info.)

To properly time function executions, simply call block_until_ready on any JAX op, e.g.

```
>>> t = np.arange(1e7)
>>> %timeit np.dot(t, t).block_until_ready()
100 loops, best of 5: 16 ms per loop
```

### RNG mangement

The cool part is that the user manages all the (non-)determinism!

For any jax.random op, pass in this array object known as an RNG key. A good practise is to replace the key after each split to ensure reproducibility:

```
>>> key = jax.random.PRNGKey(0)
>>> key, *subkeys = jax.random.split(key, 3)
>>> n1 = jax.random.normal(subkeys[0],  (1,))
DeviceArray([0.5781487], dtype=float32)
>>> n2 = jax.random.normal(subkeys[1],  (1,))
DeviceArray([0.85355157], dtype=float32)
```

### XLA-esque things

To be JAX-onic, one must apply transformations on functions without side effects (e.g. functionally pure). Since it is XLA-compiled in the backend, there are some things that you cannot do like you would normally in *Python*.

Notably, xx[-1, -1] = 5 now becomes:

```
>>> jax.ops.index_update(xx,  (-1,  -1),  5)
```

which is similar to the effects of @tf.function in *Tensorflow* where data structures are immutable.

### import jax.numpy as np; import numpy as onp

Upon importing JAX *Numpy*, one can easily access all the standard operations:

```
>>> x = np.diag(np.arange(10))
DeviceArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], dtype=int32)
>>> x + x
DeviceArray([ 0, 2, 4, 6, 8, 10, 12, 14, 16, 18], dtype=int32)
>>> xx = np.ones((4, 4))
>>> np.linalg.block_diag(xx)
DeviceArray([[1., 1., 0., 0., 0., 0.], 
             [1., 1., 0., 0., 0., 0.], 
             [0., 0., 1., 1., 1., 0.], 
             [0., 0., 1., 1., 1., 0.], 
             [0., 0., 1., 1., 1., 0.], 
             [0., 0., 0., 0., 0., 1.]], dtype=float32)
```

If you want to define your own ops, check out lax.ops for primitive operations that are XLA-compiled, and that are optimized to run in JAX’s non-static function decorators.

### import jax.grad as grad

Taking gradients of functions (e.g. in the parameter update step of gradient descent optimization) using JAX’s autodiff package is super easy and clear!

*Note:* grad requires a float or complex input, cast accordingly.

```
def fn(a, b):
	return np.sum((a - b)**2)
grad_fn = grad(fn) # i.e. f'(x) = 2(a - b)
value_grad_fn = jax.value_and_grad(fn)
partial_fn = grad(fn, argnums=(0, 1))
```

Unlike GradientTape in *Tensorflow* or .backward() in *Pytorch*, you can easily take derivatives

```
>>> a = np.arange(1, 5).astype(float)
>>> b = a + 0.1
>>> dfn_da = grad_fn(a, b)
>>> dfn_da
DeviceArray([-0.20000005, -0.19999981, -0.19999981, -0.19999981], dtype=float32)
>>> value, dfn_da = value_grad_fn(a, b)
>>> value, dfn_da
(DeviceArray(0.03999995, dtype=float32), 
DeviceArray([-0.20000005, -0.19999981, -0.19999981, -0.19999981], dtype=float32))
```

or decide which arguments to differentiate with respect to:

```
>>> del_a, del_b = partial_fn(a, b)
>>> del_a, del_b
(DeviceArray([-0.20000005, -0.19999981, -0.19999981, -0.19999981], dtype=float32), 
DeviceArray([0.20000005, 0.19999981, 0.19999981, 0.19999981], dtype=float32))
```

To turn off gradients, use lax.stop_gradient and gradient signals will not be propagated:

```
def loss_fn(x, y):
	return (jax.lax.stop_gradient(x - y) - (x * y)) ** 2
```

#### Advanced differentiation

Aside from jax.jacobian or jax.hessian, in jax.experimental you can take higher order derivatives using jet!

For additional control and precision, you can compute forward-mode and backward-mode Jacobian-vector products of your fn via jax.jvp and jax.jvp or differentiate forward or reverse via jax.jacfwd and jax.jacrev, respectively.

## from jax import jit

Here’s all the hype about speed-ups you have been hearing about. With jit, our code is XLA-compiled and ran on the accelerators of our choice!

Simply wrap a function with the @jit decorator to mark it for compilation. [Example](https://jax.readthedocs.io/en/latest/notebooks/thinking_in_jax.html?highlight=static%20argnums#jit-mechanics-tracing-and-static-variables) from JAX docs:

```
@jit
def f(x, y):
  print("Running f():")
  print(f"  x = {x}")
  print(f"  y = {y}")
  result = jnp.dot(x + 1, y + 1)
  print(f"  result = {result}")
  return result

>>> x = np.random.randn(3, 4)
>>> y = np.random.randn(4)
>>> f(x, y)
Running f():
  x = Traced<ShapedArray(float32[3,4])>with<DynamicJaxprTrace(level=0/1)>
  y = Traced<ShapedArray(float32[4])>with<DynamicJaxprTrace(level=0/1)>
  result = Traced<ShapedArray(float32[3])>with<DynamicJaxprTrace(level=0/1)>

DeviceArray([0.25773212, 5.3623195 , 5.4032435 ], dtype=float32)
```

#### Gotchas

Because of the compilation, you cannot condition on input values but only on input shape and type. In those cases, you can either manually decide how to call a function dependent on the input type via lax.cond, or pass in static_argnums when defining the decorator to prevent triggering a re-compilation for each new input to that variable:

```
from functools import partial

@partial(jit, static_argnums=(3,))
def some_fn(x, y, rng, bool):
	return (x + y) if bool else (x - y)
```

Notice as well that jitted arrays are Traced objects, meaning you cannot print the values of the data, but can only see the shape and dtype. This explains why things can be so efficient because the Python code does not need to be re-executed with every new input.

## from jax import vmap

Here’s the best part: ‘vectorized’ operations. You can very nicely skip on the for-loops and efficiently compute results for batched inputs:

```
def fn(x):
	return np.dot(x, x)
>>> input = np.arange(4)
>>> batched_input = np.stack([input, input])
>>> batched_fn = jax.vmap(fn)
>>> fn(input)
DeviceArray(14, dtype=int32)
>>> batched_fn(batched_input)
DeviceArray([14, 14], dtype=int32)
```

This is opposed to the non-vectorized approach: manually looping over the batch dimension of the inputs, performing the fn operation for that dimension, concatenating the results for each batch dimension in an array, and returning the final array of stacked outputs.

Specify the axis on which to vectorize via in_axes and the axis on which to output the batched results via out_axes.

Now knowing *grad*, *jit* and *vmap*, get per-example (instead of accumulated) gradients of your loss function easily by composing / nesting operations: jit(vmap(grad(fn))).

#### import pmap

Similarly, there is pmap to actualize parallel computations on separate devices (with implicit jit compilation too). Since different parts of the batched inputs will be on different devices, consider pooling outputs from multiple devices using collective operations jax.lax.p*. Without dealing with host-host communication, specify axis_name so that collective ops can refer to the axes bound by jax.pmap (0 by default, but use different name for each different additional axis) and do the cross-device pooling on the specific operation (e.g. jax.lax.psum in this example).

*Note*: specifying axis_name without calling pmap will not have any effect.

```
def  normalized_convolution(x, w):
	output = []
	for i in  range(1,  len(x)-1):
		output.append(jnp.dot(x[i-1:i+2], w))
		output = jnp.array(output)
	return output / jax.lax.psum(output, axis_name='anything')
>>> x = np.arange(5)
>>> w = np.array([2.,  3.,  4.])
>>> n_devices = jax.local_device_count()
>>> xs = np.arange(5 * n_devices).reshape(-1,  5)
>>> ws = np.stack([w] * n_devices)
>>> jax.pmap(normalized_convolution, axis_name='anything')(xs, ws)
ShardedDeviceArray([[0.00816024, 0.01408451, 0.019437 ], 
					[0.04154303, 0.04577465, 0.04959785], 
					[0.07492582, 0.07746479, 0.07975871], 
					[0.10830861, 0.10915492, 0.10991956], 
					[0.14169139, 0.14084506, 0.14008042], 
					[0.17507419, 0.17253521, 0.17024128], 
					[0.20845698, 0.20422535, 0.20040214], 
					[0.24183977, 0.23591548, 0.23056298]], dtype=float32)
```

## Debugging etc.

### Device transfer

Do plotting and some tensor post-processing ops easier on CPU rather than the GPU. Easily move a DeviceArray to host device via jax.device_get(x) or onp.array(x) and back to accelerator via jax.device_put(x) or np.asarray(x).

### Printing

Remember how difficult it is to print() in *Tensorflow*? Same thing happens in JAX, you’ll just see a bunch of traced objects with no information. To get information from objects on devices within traced operations (e.g. vmap, pmap), simply add from jax.experimental.host_callback import id_print.

### Auxiliary info

Besides just the function’s return, you can also return extra information:

```
def fn_with_many_returns(a, b):
	return -np.sum(a * np.log(b)), np.mean(a == b)
>>> a = np.asarray([1., 0., 1., 1.])
>>> b = jax.nn.softmax(a)
>>> ce, acc = grad(fn_with_many_returns, has_aux=True)(a, b)
>>> print(ce, ',', acc)
[1.2142833, 2.2142832, 1.2142833, 1.2142833], 0.25
```

### from jax.config import config

The JAX compile logger has useful settings that can be turned on and off as sanity checks when debugging. Be sure to turn these off when running your actual experiment so things don’t get too slow from host-device communication.

#### Numerical instability

To make the program error out the moment a nan value appears, turn on the floating point checker via: config.update("jax_debug_nans", True).

For higher floating point precision, config.update("jax_enable_x64", True).

#### Check jit

One sanity check to ensure that you’ve jitted things correctly is to ensure that you don’t see any compile logs after the first iteration of your training loop: config.update('jax_log_compiles', True). The first time your runtime will be slower, but once things are compiled it should be a lot faster!

If you want to view JAXPR values, simply turn off jitting globally: config.update('jax_disable_jit', True).

#### Profiling

You can use TensorBoard profiler to debug OOM errors or visualize your program’s memory usage. Simply insert jax.profiler.start_trace(<tb_logdir>), run the code, and capture the trace with jax.profiler.stop_trace(). Refer to the instructions from the official [JAX documentation](https://jax.readthedocs.io/en/latest/profiling.html?highlight=from%20device).

## Resources

[JAX Gotchas](https://jax.readthedocs.io/en/latest/notebooks/Common_Gotchas_in_JAX.html)

[Autodiff Cookbook](https://jax.readthedocs.io/en/latest/notebooks/autodiff_cookbook.html)

[JIT mechanisms](https://jax.readthedocs.io/en/latest/notebooks/thinking_in_jax.html?highlight=static%20argnums#jit-mechanics-tracing-and-static-variables)

[Optax](https://github.com/deepmind/optax) (Modern JAX optimizers)

[Flax](https://github.com/google/flax) (nice, composable NN layers)

[Haiku](https://github.com/deepmind/dm-haiku) (non-functional API)

[Blog by my friend Joao](https://joaogui1.netlify.app/post/intro_jax_pt1/) (in Portugese!)

[awesome-jax by my friend Nick](https://github.com/n2cholas/awesome-jax)
