import win32com.client as win32
import os

try:
    word = win32.gencache.EnsureDispatch('Word.Application')
    word.Visible = False
    print("MS Word COM is available!")
    word.Quit()
except Exception as e:
    print("Error starting Word via COM:", e)
