
import sys

def count_braces(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    line_num = 1
    col_num = 1
    errors = []
    
    i = 0
    while i < len(content):
        char = content[i]
        if char == '\n':
            line_num += 1
            col_num = 1
        else:
            col_num += 1
            
        if char == '{':
            stack.append(('{', line_num, col_num))
        elif char == '}':
            if not stack:
                errors.append(f"Unmatched '}}' at line {line_num}, col {col_num}")
            else:
                stack.pop()
        i += 1
        
    for brace in stack:
        errors.append(f"Unmatched '{brace[0]}' at line {brace[1]}, col {brace[2]}")
        
    return errors

if __name__ == "__main__":
    file_path = "d:\\onnrides\\app\\admin\\trip-initiation\\page.tsx"
    errors = count_braces(file_path)
    if not errors:
        print("Braces are balanced.")
    else:
        for error in errors:
            print(error)
