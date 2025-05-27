---
title: "Prioritized training on points that are learnable, worth learning, and not yet learned"
date: 2021-07-06
tags: []
---

[Soren Mindermann*](https://oatml.cs.ox.ac.uk/members/soren_mindermann/), [Muhammed Razzak*](https://oatml.cs.ox.ac.uk/members/muhammed_razzak/), **Winnie Xu***, [Andreas Kirsch](https://www.blackhc.net), [Mrinank Sharma](https://mrinanksharma.github.io), [Adrien Morisot](https://cohere.ai/about), [Aidan N. Gomez](https://oatml.cs.ox.ac.uk/members/aidan_gomez/), [Sebastian Farquhar](https://sebastianfarquhar.com), [Jan Brauner](https://www.fhi.ox.ac.uk/team/janbrauner/), [Yarin Gal](http://www.cs.ox.ac.uk/people/yarin.gal/website/)

We introduce Goldilocks Selection, a technique for faster model training which selects a sequence of training points that are "just right". We propose an information-theoretic acquisition function -- the reducible held-out loss -- and compute it with a small proxy model -- GoldiProx -- to efficiently choose training points that maximize information about a validation set. We show that the selected sequence not only prioritizes learnable, yet information rich data relevant to the evaluation task but also effectively transfers across architectures and vision tasks.

International Conference on Machine Learning (ICML), 2022 **[Spotlight]**.

**[Paper](https://arxiv.org/abs/2107.02565)** | **[Poster](research/goldiprox-poster.pdf)** 