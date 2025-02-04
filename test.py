
# use this command
cmd_string = 'vbat'

# convert the string to a bytearray needed by write()
cmd_bytearray = cmd_string.encode()

cr = b'\r'
lf = b'\n'
crlf = cr + lf
prompt = b'ch> '

print(cmd_bytearray + cr)

js_bytes = bytes([118, 98, 97, 116, 13])

print(js_bytes)