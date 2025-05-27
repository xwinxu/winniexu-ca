---
title: "Multi-Game Decision Transformers"
date: 2022-05-30
---

## Multi-Game Decision Transformers

[Kuang-Huei Lee*](https://kuanghuei.github.io/), [Ofir Nachum*](https://scholar.google.com/citations?user=C-ZlBWMAAAAJ&hl=en), [Mengjiao Yang](https://sherryy.github.io/), [Lisa Lee](https://leelisa.com/), **Winnie Xu**, [Daniel Freeman](https://research.google/people/DanielFreeman/), [Sergio Guadarrama](https://scholar.google.com/citations?user=gYiCq88AAAAJ&hl=en), [Eric Jang](https://evjang.com/), [Henryk Michalewski](https://scholar.google.com/citations?user=YdHW1ycAAAAJ&hl=en), [Ian Fischer](https://scholar.google.com/citations?user=Z63Zf_0AAAAJ&hl=en), [Igor Mordatch](https://scholar.google.com/citations?user=Vzr1RukAAAAJ&hl=en)

A longstanding goal in the field of AI is to find a strategy for compiling diverse experience into a highly capable, generalist agent. In the subfields of vision and language, this was largely achieved by scaling up transformer-based models and training them on large, diverse datasets. Motivated by this progress, we train one generalist control agent on a diverse set of offline data to play 46 Atari games. We demonstrate scaling of performance in the model size and rapid adaptation to novel games with fine-tuning. Compared to existing methods in behavioural cloning, online, and offline RL, MGDT offers the best scalability and performance.

Neural Information Processing Systems (NeurIPS), 2022 **[Oral]**.

**[Web](https://sites.google.com/corp/view/multi-game-transformers)** | **[Paper](https://arxiv.org/abs/2205.15241)** | **[Blog](https://ai.googleblog.com/2022/07/training-generalist-agents-with-multi.html)** | **[Code](https://github.com/google-research/google-research/tree/master/multi_game_dt)** 