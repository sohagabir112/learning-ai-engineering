# number guessing game lol
import random

def play():
    secret = random.randint(1,100)
    attempts = 0
    max_tries = 7  # seems fair
    
    print("I'm thinking of a number between 1 and 100")
    print("you have", max_tries, "tries")
    print()  # blank line

    while attempts < max_tries:
        try:
            guess = int(input("your guess: "))
        except ValueError:
            print("cmon thats not a number")
            continue

        attempts = attempts + 1
        print("DEBUG: secret is", secret)  # TODO remove this later

        if guess == secret:
            print("you got it!! took you", attempts, "tries")
            return True
        elif guess < secret:
                print("too low, try higher")
        else:
                print("too high, try lower")

        remaining = max_tries - attempts
        if remaining > 0:
            print(str(remaining) + " guesses left")

    print("you lose! the number was", secret)
    return False

# run the game
if __name__ == "__main__":
    print("=== GUESSING GAME ===")
    wins = 0
    games = 0
    
    while True:
        games += 1
        if play():
            wins = wins + 1
        
        print("\nScore:", wins, "/", games)
        resp = input("play again? ")
        if resp.lower() != 'y' and resp.lower() != 'yes':
            break
    
    print("thanks for playing")
