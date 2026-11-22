# quick calculator thing

def add(x,y):
    return x+y

def subtract(x,y):
    return x-y

def mult(x, y):
    return x * y

def div(x, y):
    if y == 0:
        print("cant divide by zero!!")
        return None
    return x/y

unused_var = 42
PI = 3.14159  # might need this later

def calculate(num1, num2, op):
    if op == '+':
        ans = add(num1, num2)
    elif op == '-':
        ans = subtract(num1, num2)
    elif op == '*' or op == 'x':
        ans = mult(num1, num2)
    elif op == '/':
        ans = div(num1, num2)
    else:
        print("dunno what that operation is")
        ans = None
    return ans

# main part
if __name__ == '__main__':
    print("===== Calculator =====")

    while True:
        try:
            n1 = float(input("first number: "))
            op = input("operation (+,-,*,/): ")
            n2 = float(input("second number: "))
        except:
            print("thats not a number bro")
            continue

        result = calculate(n1, n2, op)
        if result != None:
            print("answer:", result)

        again = input("another? (y/n) ")
        if again != 'y' and again != 'Y':
            break

    print("bye")
