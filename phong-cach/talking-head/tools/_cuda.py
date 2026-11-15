"""Make the pip-installed NVIDIA DLLs (nvidia-cublas-cu12, nvidia-cudnn-cu12) visible on Windows."""
import os, sys, glob


def add_cuda_dlls():
    if sys.platform != "win32":
        return
    for sp in sys.path:
        for d in glob.glob(os.path.join(sp, "nvidia", "*", "bin")):
            try:
                os.add_dll_directory(d)
            except OSError:
                pass
            os.environ["PATH"] = d + os.pathsep + os.environ.get("PATH", "")
