# Sorting assignment - Charlie (student C)
# Using quicksort and selection sort

import random

def quicksort(numbers):
    if len(numbers) < 2:
        return numbers

    pivot = numbers[len(numbers) // 2]
    less = []
    equal = []
    greater = []

    for num in numbers:
        if num < pivot:
            less.append(num)
        elif num == pivot:
            equal.append(num)
        else:
            greater.append(num)

    return quicksort(less) + equal + quicksort(greater)


def selection_sort(numbers):
    # make a copy first
    nums = numbers[:]

    for i in range(len(nums)):
        # find the smallest element in remaining part
        min_idx = i
        for j in range(i + 1, len(nums)):
            if nums[j] < nums[min_idx]:
                min_idx = j

        # swap current with the minimum
        nums[i], nums[min_idx] = nums[min_idx], nums[i]

    return nums


def run_tests():
    test1 = [38, 27, 43, 3, 9, 82, 10]
    print("Test array:", test1)
    print("Quicksort: ", quicksort(test1))
    print("Selection: ", selection_sort(test1))
    print()

    # random test
    random_arr = [random.randint(0, 100) for _ in range(10)]
    print("Random array:", random_arr)
    qs_result = quicksort(random_arr)
    ss_result = selection_sort(random_arr)
    print("Quicksort: ", qs_result)
    print("Selection: ", ss_result)

    # verify both give same answer
    assert qs_result == ss_result, "Results don't match!"
    print("Both sorts match - good!")


if __name__ == "__main__":
    run_tests()
