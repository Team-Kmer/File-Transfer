package com.filetransfer.file;

import java.io.IOException;
import java.io.OutputStream;

@FunctionalInterface
public interface ContentWriter {

    void writeTo(OutputStream output) throws IOException;
}