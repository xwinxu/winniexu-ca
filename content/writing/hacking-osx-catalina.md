---
title: "Hacking OSX Catalina in < 10.15 Commands"
tags:
  - tools
---

**Where did my Conda envs go? Why is my Mujoco breaking? Why can't I compile my C program anymore? Is Spotify now a virus?**

This post is where I'll list some of the (hopefully) temporary hacks to get your dependencies up and running again with the new OS X update, which prevents you from writing to the root directory and installing third party applications without manually clicking on icons.

## Anaconda

You will have a directory on *~/Desktop* called *Relocated items.* To restore your environments,
- Download the conda prefix replacement tool:

```
curl -L  https://repo.anaconda.com/pkgs/misc/cpr-exec/cpr-0.1.1-osx-64.exe -o cpr 
&& chmod +x cpr
```

- Re-home your anaconda directory:

```
./cpr rehome ~/anaconda3
```

- Re-run conda init to fix your shell environment:

```
source ~/anaconda3/bin/activate
conda init
```

- Optional: get ride of the base environment

```
conda config --set auto_activate_base False
```

## Header Files

For if [Clang, or gcc](https://github.com/pypa/pip/issues/6222), and Mujoco (which depends on building using wheel) breaks.
- Note: you don't need the Xcode IDE, you can just get the latest version of Xcode CLI

```
xcode-select --install
```

- Run to find the locations of your header files:

```
sudo find /Library -name stdio.h
```

Notice there are no header files in */usr/include* as before.
- Rename the SDK directories to use the previous Mojave OSX SDK as *sysroot* again (cd into /Library/Developer/CommandLineTools/SDKs/):

```
mv MacOSX.sdk/ MacOSX_current.sdk
```

```
cp MacOSX10.14.sdk/ MacOSX.sdk
```

You may get some warnings about header files already existing, ignore them.

## Un-verified Downloads

You may encounter the error: `cannot be opened because the developer cannot be verified.` Usually you can just go to the app icon, right click, then Open, however this won't be convenient sometimes. So from the command line:
- Allow apps downloaded from anywhere

```
sudo spctl --master-disable
```

- Similarly, going to the S*ecurity & Privacy* settings in S*ystem Preferences:*

```
check the Terminal App under Developer Tools in Privacy tab
```

## Closing Thoughts

The solutions I have outlined above in this blog post definitely work to mirror the features and freedoms (to a certain extent) of the old OSX 10.14. As more updates and patches roll in for OSX 10.15, these hacks may no longer be necessary, but in the meantime, I hope this helped you get unblocked!
