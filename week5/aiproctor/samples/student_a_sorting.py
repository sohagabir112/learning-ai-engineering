# sorting algorithms - assignment 1
# wrote this for CS201 class

def bubble_sort(arr):
    # my bubble sort implementation
    my_list = list(arr)  # make a copy so we dont mess up original
    n = len(my_list)
    swapped = True

    while swapped:
        swapped = False
        for i in range(n - 1):
            if my_list[i] > my_list[i + 1]:
                # swap them
                temp = my_list[i]
                my_list[i] = my_list[i + 1]
                my_list[i + 1] = temp
                swapped = True
        # could optimize here but whatever
        n = n - 1

    return my_list


def merge_two_halves(left_part, right_part):
    result = []
    i = 0
    j = 0

    while i < len(left_part) and j < len(right_part):
        if left_part[i] <= right_part[j]:
            result.append(left_part[i])
            i = i + 1  # using i = i+1 instead of += just cause
        else:
            result.append(right_part[j])
            j = j + 1

    # add whatever is left over
    while i < len(left_part):
        result.append(left_part[i])
        i += 1
    while j < len(right_part):
        result.append(right_part[j])
        j += 1

    return result


def merge_sort(arr):
    if len(arr) <= 1:
        return arr

    # find middle point
    mid = len(arr) // 2
    left_half = arr[:mid]
    right_half = arr[mid:]

    # sort each half recursively
    sorted_left = merge_sort(left_half)
    sorted_right = merge_sort(right_half)

    return merge_two_halves(sorted_left, sorted_right)


if __name__ == "__main__":
    test_data = [64, 34, 25, 12, 22, 11, 90, 1]
    print("original:", test_data)

    bubble_result = bubble_sort(test_data)
    print("bubble sort result:", bubble_result)

    merge_result = merge_sort(test_data)
    print("merge sort result:", merge_result)

    # extra test with already sorted
    sorted_list = [1, 2, 3, 4, 5]
    print("already sorted test:", bubble_sort(sorted_list))
