using System;
using System.Management;
using System.IO.Ports;
using System.IO;
using System.Threading;
using System.Runtime.InteropServices;
using System.Diagnostics;

/*
The MIT License (MIT)
Copyright © 2020 Edward March 
Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
and associated documentation files (the “Software”), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or 
substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


namespace VnaCmdLine
{
    class Program
    {
        /*
        [StructLayout(LayoutKind.Explicit)]
        struct Int32_b03_t
        {
            [FieldOffset(0)] public Int32 n;
            [FieldOffset(0)] public byte b0;
            [FieldOffset(1)] public byte b1;
            [FieldOffset(2)] public byte b2;
            [FieldOffset(3)] public byte b3;
        };

        [StructLayout(LayoutKind.Explicit)]
        struct Int16_b01_t
        {
            [FieldOffset(0)] public Int16 n;
            [FieldOffset(0)] public byte b0;
            [FieldOffset(1)] public byte b1;
        };


        unsafe struct FIFO32_t
        {
            public Int32_b03_t fwd0Re;
            public Int32_b03_t fwd0Im;
            public Int32_b03_t rev0Re;
            public Int32_b03_t rev0Im;
            public Int32_b03_t rev1Re;
            public Int32_b03_t rev1Im;
            public Int16_b01_t freqIndex;
            public fixed byte reserved[6];
        };

        [StructLayout(LayoutKind.Explicit)]
        unsafe struct FIFO32A_tejm 
        {
            [FieldOffset(0)] public FIFO32_t Fifo;
            [FieldOffset(0)] public byte[] bytes;
        };*/

        static long fwd0Re, fwd0Im, rev0Re, rev0Im, freqIndex;


        static string MITLicense = "\nThe MIT License (MIT)\n" +
        "Copyright © 2020 Edward March\n" +
        "Permission is hereby granted, free of charge, to any person obtaining a copy of this software\n" +
        "and associated documentation files (the “Software”), to deal in the Software without restriction,\n" +
        "including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,\n" +
        "and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, \n" +
        "subject to the following conditions:\n" +
        "\n" +
        "The above copyright notice and this permission notice shall be included in all copies or\n" +
        "substantial portions of the Software.\n" +
        "\n" +
        "THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, \n" +
        "INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A\n" +
        "PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT\n" +
        "HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF\n" +
        "CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE\n" +
        "OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n" +
        "\n";
        static SerialPort ser = null;

        //
        // Display the MIT License and My website link
        //
        static void ShowMitLicense()
        {
            Console.WriteLine(MITLicense);
            Console.WriteLine("\n\nCode at https://www.WB9RAA.com/NanoVNA\n\n");
        }

        //
        // Display the usage and some examples 
        //
        static void ShowUsage()
        {
            Console.WriteLine("VnaCmdLine  Version 1.0A  October 29, 2020 WB9RAA -- MIT License");
            Console.WriteLine("Usage:");
            Console.WriteLine("  VnaCmdLine -H[elp]");
            Console.WriteLine("  VnaCmdLine -lic[ense]\n");
            Console.WriteLine("  VnaCmdLine -Exa[mples] > MyTextFile.txt\n");
            Console.WriteLine("  VnaCmdLine <ComPort> <OpCode> <Register> <NN> [...]");
            Console.WriteLine("  VnaCmdLine <ComPort> @MyTextFile.txt");
            //
            Console.WriteLine("Example: VnaCmdLine -help");
            Console.WriteLine("Example: VnaCmdLine -scan");
            Console.WriteLine("Example: VnaCmdLine -dev[ices]");
            Console.WriteLine("Example: VnaCmdLine 3  READ2 0 2");
            Console.WriteLine("Example: VnaCmdLine 2  $swr 146.52mhz");
        }
        //
        // Display more detailed help examples
        //
        static void ShowHelp()
        {
            ShowUsage();
            String help = "\nHELP\n" +
                "<comPort> 1 thru 256 inclusive\n" +
                "Names are not case sensitive\n" +
                "<OpCodes> Names: NOP INDICATE READ READ2 READ4 READFIFO WRITE WRITE2 WRITE4 WRITE8 WRITEFIFO\n" +
                "<OpCode> Values:  0x00 0x0d 0x10 0x11 0x12 0x18 0x20 0x21 0x22 0x23 0x28\n" +
                "<Register> Names: sweepStartHz sweepStepHz sweepPoints valuesPerFrequencey rawSamleMode ValuesFIFO\n" +
                "          deviceVariant protocolVersion hardwareVersion firmwareMajor firmwareMinor\n" +
                "//My Nicknames: sweepstart sweepstep devvar protover hwver fwmaj fwmin\n" +
                "<Register> Values: 0x00 0x10 0x20 0x22 0x26 0x30 0xf0 0xf1 0xf2 0xf3 0xf4\n" +
                "<NN> Number byte 00..255 or 0x00..0xff\n" +
                "<frequency> number in Hertz or suffix with 'K,k,M,m,G,g' i.e. 146.52m 102.1M 75,000 88mhz 108mhz\n" +
                "   , are cosmetic only hz is optional\n" +
                "Text in @MyFile -- Line starting with '/' or '#' are comments\n\n" +
                "My High Level function start with $ as:  <ComPort> $swr frequency\n" +
                "";
            Console.WriteLine(help);
        }
        static void ShowExamples()
        {
            String ex =
                "NOP\n" +
                "Indicate\n" +
                "READ 0\n" 
                ;
            Console.WriteLine(ex);
        }


        //
        // Open COM Port or die ! 
        //
        static void OpenPort(int portn)
        {
            try
            {
                int baud = 115200;
                String n = "COM" + portn.ToString();
                ser = new SerialPort(n, baud);
                ser.WriteTimeout = 10;
                ser.ReadTimeout = 1200;
                ser.Handshake = Handshake.XOnXOff;
                ser.DataBits = 8;
                ser.StopBits = StopBits.One;
                ser.Parity = Parity.None;
                ser.ReadBufferSize = 1024;
                ser.WriteBufferSize = 1024;
                ser.Open();
                Console.WriteLine(n + " Opended");
            }
            catch (Exception e)
            {
                Console.WriteLine("Error: "+e.Message.ToString());
                Environment.Exit(1);
            }
        }
        //
        // Close COM Port 
        //
        static void ClosePort()
        {
            try
            {
                ser.Close();
            }
            catch (Exception) { }
        }

        //
        // Show a list of COM ports that are available 
        //
        static void ScanComPorts()
        {
            try
            {
                ManagementObjectSearcher searcher = new ManagementObjectSearcher("root\\CIMV2", "SELECT * FROM Win32_PnPEntity");

                foreach (ManagementObject queryObj in searcher.Get())
                {
                    String s = "";
                    try
                    {
                        s = queryObj["Caption"].ToString();
                    }
                    catch (Exception) { }
                    if (s.ToUpper().Contains("(COM"))
                    {
                        int i = s.IndexOf("(COM");
                        if (i > 0)
                        {
                            i++; // skip (
                            int j = i + s.Substring(i).IndexOf(")");
                            String ss = s.Substring(i, j - i);
                            Console.WriteLine(ss + " " + s);
                        }
                    }
                }
            }
            catch (Exception) { }
        }

        //
        // unlike C -- args in C# are are  [0] is first paremeter
        // The exe is not part of this arguments array 
        // In C# the first user paameter is at args[0] 
        //
        static void Main(string[] args)
        {
            int a = args.Length;
            if (a == 0)
            {
                ShowUsage();
            }
            else if (a == 1)
            {
                if (args[0].ToLower().StartsWith("-lic"))
                {
                    ShowMitLicense();
                }
                else if (args[0].ToLower().StartsWith("-h"))
                {
                    ShowHelp();
                }
                else if (args[0].ToLower().StartsWith("-sca"))
                {
                    ScanComPorts();
                }
                else if (args[0].ToLower().StartsWith("-exa"))
                {
                    ShowExamples();
                }
                else if (args[0].ToLower().StartsWith("-dev"))
                {
                    Process.Start("devmgmt.msc");
                }
            }
            else if (a >= 2)
            {
                int portn = int.Parse(args[0]);
                if (portn < 1 || portn > 256)
                {
                    Console.WriteLine("Error: COMPORT number must be between 1 and 256 inclusive");
                    return;
                }
                OpenPort(portn); 
                //
                String line = "";
                if (args[1].StartsWith("@"))
                {
                    StreamReader sr = null;
                    try
                    {
                        sr = new StreamReader(args[1].Substring(1));
                        while (!sr.EndOfStream)
                        {
                            line = sr.ReadLine();
                            line = line.Trim();
                            Console.WriteLine(line);
                            if (line.Length > 3 && line[0] != '#' && line[0] != '/')
                            {
                                Exec(line);
                            }
                        }
                    }
                    catch(Exception e)
                    {
                        Console.WriteLine("Error: " + e.Message.ToString());
                        ClosePort();
                        Environment.Exit(1);
                    }
                    ClosePort();
                }
                else
                {
                    for (int i = 1; i < args.Length; i++)
                    {
                        line = line + args[i] + " ";
                    }
                    Exec(line);
                    ClosePort();
                }
            }
        }

        //
        // Execute the line of parameters after COMPORT number
        // examples s = "READ4 0x30 32"
        //          s = "24 0x30 1"
        //
        static void Exec(String s)
        {
            s = s.Trim();
            String[] ss;
            ss = s.Split(' ');
            String o = "";
            for (int i = 0; i < ss.Length; i++)
            {
                if (i == 0)
                {
                    o += ExpandOpcode(ss[i]);
                    if(ss.Length == 2)
                    {
                        if(ss[0].ToLower().Equals("$swr"))
                        {
                            String freqs = NumberToBytes(ss[1], 8);
                            o = ExpandOpcode("WRITE8") + " " + ExpandRegisterString("sweepStartHz") + " " + freqs;
                            WriteBytes(o);
                            PrintReply();
                            o = ExpandOpcode("WRITE4") + " " + ExpandRegisterString("SweepStepHz") + " 0";
                            WriteBytes(o);
                            PrintReply();
                            o = ExpandOpcode("WRITE4") + " " + ExpandRegisterString("sweepPoints") + " 1";
                            WriteBytes(o);
                            PrintReply();
                           //ejm o = ExpandOpcode("WRITE4") + " " + ExpandRegisterString("valuesPerFrequency") + " 32";
                           // WriteBytes(o);
                           // PrintReply();

                            Exec("READFIFO valuesFIFO 32");
                            //ejmExec("READFIFO valuesFIFO 32");
                            //ejmExec("READFIFO valuesFIFO 32");
                            //ejmExec("READFIFO valuesFIFO 32");
                            o = "";
                            double fv = Math.Sqrt((fwd0Re * fwd0Re) + (fwd0Im * fwd0Im));
                            double rv = Math.Sqrt((rev0Re * rev0Re) + (rev0Im * rev0Im));
                            double prf = Math.Sqrt(rv/fv);
                            double swr = (1 + fv) / (1 - rv);
                            Console.WriteLine("fv=" + fv.ToString() + " rv=" + rv.ToString() + "  prf="+prf.ToString()+"  SWR=1:" + swr.ToString());
                            double swr2 = (1 + prf) / (1 - prf);
                            Console.WriteLine(" SWR2=1:" + swr2.ToString());

                            double swr3 = (1 + fwd0Re) / (1 - rev0Re);
                            Console.WriteLine(" SWR2=1:" + swr3.ToString());
                            break;
                        }
                    }
                }
                else if (i == 1)
                {
                    o += ExpandRegisterString(ss[i]);
                }
                else
                {
                    char ce = ss[0][ss[0].Length - 1];
                    int b = 1;
                    if(ce == '2')
                    {
                        b = 2;
                    }
                    else if (ce == '4')
                    {
                        b = 4;
                    }
                    else if (ce == '8')
                    {
                        b = 8;
                    }
                    o += NumberToBytes(ss[i],b);
                }
                o += " ";
            }
            if(o.Length > 0)
            {
                WriteBytes(o);
                PrintReply();
            }
        }
        //
        // Read up to 32 bytes from seria lport and show what you can
        //
        static void PrintReply()
        {
            Byte[] rb = new Byte[32];
            String[] Names = { "fwd0Re", "fwd0Im", "rev0Re", "rev0Im", "fwd1Re", "fwd1Im","freqIndex","(reserved)" };
            int ni = 0;
            fwd0Re = fwd0Im = rev0Re = rev0Im = freqIndex = 0;

            try
            {
                long v = 0;
                Thread.Sleep(300);
                int n = ser.Read(rb, 0, 32);


                Console.Write("Hex Reply:\n");
                for (int i = 0; i < n; i++)
                {
                    Console.Write("0x" + rb[i].ToString("X2"));
                    Console.Write(" ");
                    if(i < 0x18 && (i & 3) == 3)
                    {
                        v = (rb[i - 0] << 24) | (rb[i - 1] << 16) | (rb[i - 2] << 8) | (rb[i-3]); // little endian
                        if (i == 3)
                            fwd0Re = v;
                        else if(i == 7)
                            fwd0Im = v;
                        else if (i == 11)
                            rev0Re = v;
                        else if (i == 15)
                            rev0Im = v;

                        if (n == 32)
                        {
                            Console.Write(Names[ni++]);
                            Console.Write(" ");
                        }
                        Console.Write(v.ToString());
                        Console.Write("\n");
                    }
                    else if (i == 0x19)
                    {
                        v = (rb[i - 1] << 8) | (rb[i]);
                        freqIndex = v;
                        if (n == 32)
                        {
                            Console.Write(Names[ni++]);
                            Console.Write(" ");
                        }
                        Console.Write(v.ToString());
                        Console.Write("\n");
                    }
                    else if (i >= 0x1a)
                    {
                        if(i == 0x1f)
                        {
                            if(n == 32)
                            {
                                Console.Write(" ");
                                Console.Write(Names[ni]);
                            }
                            Console.Write("\n");
                        }
                    }
                }
            }
            catch (Exception) { }

            Console.WriteLine("fwd0 real "      + fwd0Re.ToString());
            Console.WriteLine("fwd0 imaginary " + fwd0Im.ToString());
            Console.WriteLine("rev0 real "      + rev0Re.ToString());
            Console.WriteLine("rev0 imaginary " + rev0Im.ToString());
            Console.WriteLine("freq index " +     freqIndex.ToString());

        }

        //
        // Write bytes to serial port 
        // s = "0x12 0x34 0x56 0x78 ..."
        //
        static void WriteBytes(String s)
        {
            s = s.Trim();
            Console.Write("Serial Tx: " + s);
            String[] ss = s.Split(' ');
            int n = ss.Length;
            int n5 = n;
            if(n5 < 5)
            {
                n5 = 5;
            }
            byte[] ba = new byte[n5];

            for(int i=0; i<n; i++)
            {
                if (ss[i].StartsWith("0x"))
                {
                    ba[i] = (byte)Convert.ToInt16(ss[i], 16);
                }
                else
                {
                    ba[i] = (byte)Convert.ToInt16(ss[i], 10);
                }
            }
            ser.Write(ba, 0, ba.Length);
            Console.Write("\n");
        }

        //
        // Expand register name to hex value 
        // "protocolVersion" => "0xf1" 
        //
        static String ExpandRegisterString(String s)
        {
            String rs = s;
            s = s.ToLower();
            s = s.Replace("sweepstarthz",   "0x00");
            s = s.Replace("sweepstart",     "0x00");
            //
            s = s.Replace("sweepstephz",    "0x10");
            s = s.Replace("sweepstep",      "0x10");
            //
            s = s.Replace("sweeppoints",    "0x20");
            //
            s = s.Replace("valuesperfrequency",  "0x22");
            s = s.Replace("valuesperfreq", "0x22");
            //
            s = s.Replace("rawsamplemode",  "0x26");
            s = s.Replace("valuesfifo",     "0x30");
            //
            s = s.Replace("devicevariant",  "0xf0");
            s = s.Replace("protocolversion","0xf1");
            s = s.Replace("hardwarerevision","0xf2");
            s = s.Replace("firmwaremajor",  "0xf3");
            s = s.Replace("firmwareminor",  "0xf4");
            //
            //NickNames devvar protover hwrev fwmaj fwmin
            s = s.Replace("devvar",     "0xf0");
            s = s.Replace("protover",   "0xf1");
            s = s.Replace("hwrev",      "0xf2");
            s = s.Replace("fwmaj",      "0xf3");
            s = s.Replace("fwmin",      "0xf4");
            //
            return s;
        }

        //
        // Expand OpCode to byte
        // "nop" => "0x00"
        //
        static String ExpandOpcode(String s)
        {
            s = s.ToLower();
            s = s.Replace("nop",        "0x00");
            s = s.Replace("indicate",   "0x0d");
            //
            s = s.Replace("read2",      "0x11");
            s = s.Replace("read4",      "0x12");
            s = s.Replace("readfifo",   "0x18");
            s = s.Replace("read",       "0x10");
            //
            s = s.Replace("write2",     "0x21");
            s = s.Replace("write4",     "0x22");
            s = s.Replace("write8",     "0x23");
            s = s.Replace("writefifo",  "0x28");
            s = s.Replace("write",      "0x20");
            return s;
        }

        //
        // Convert a variety of numbers including frequencies to bytes 
        // "1234" =>  "0xD2 0x04"
        // "146.62m"  =>  "0xC0 0xB7 0xBB 0x08 0x00 0x00 0x00 0x00"
        //
        static String NumberToBytes(String s, int nBytes)
        {
            String rs = s;
            double v = 0;
            s = s.ToLower();
            int Base = 0;
            try
            {
                if (s.StartsWith("0x"))
                {
                    Base = 16;
                }
                else if (s[0] >= '0' && s[0] <= '9')
                {
                    Base = 10;
                    foreach (char c in s)
                    {
                        if (c >= 'a' && c <= 'f')
                        {
                            Base = 16;
                        }
                    }
                    if (Base == 16 && s.StartsWith("0x") == false)
                    {
                        s = "0x" + s;
                    }
                }
                if (Base > 0)
                {
                    s = s.Replace(",", ""); // remove commas
                    s = s.Replace("hz", ""); // remove Hz
                    if (s.EndsWith("k"))
                    {
                        // KILO suffix
                        s = s.Replace("k", "");
                        v = Convert.ToDouble(s);
                        v = v * 1000;
                    }
                    else if (s.EndsWith("m"))
                    {
                        // MEGA suffix
                        s = s.Replace("m", "");
                        v = Convert.ToDouble(s);
                        v = v * 1000000;
                    }
                    else if (s.EndsWith("g"))
                    {
                        // GIGA suffix
                        s = s.Replace("g", "");
                        v = Convert.ToDouble(s);
                        v = v * 1000000000;
                    }
                    else
                    {
                        v = Convert.ToInt64(s, Base);
                        if (v < 0)
                        {
                            throw new System.ArgumentException("Parameter cannot be negitive", "input");
                        }
                    }
                    rs = "";
                    // little endian 
                    long l = (long)v;
                    byte b0, b1, b2, b3, b4, b5, b6, b7;
                    b0 = (byte)(l & 255); l = l >> 8;
                    b1 = (byte)(l & 255); l = l >> 8;
                    b2 = (byte)(l & 255); l = l >> 8;
                    b3 = (byte)(l & 255); l = l >> 8;
                    b4 = (byte)(l & 255); l = l >> 8;
                    b5 = (byte)(l & 255); l = l >> 8;
                    b6 = (byte)(l & 255); l = l >> 8;
                    b7 = (byte)(l & 255);

                    String p = "0x";
                    if (nBytes == 1)
                    {
                        rs += p + b0.ToString("X2");
                    }
                    else if (nBytes == 2)
                    {
                        rs += p + b0.ToString("X2") + " ";
                        rs += p + b1.ToString("X2");
                    }
                    else if (nBytes == 4)
                    {
                        rs += p + b0.ToString("X2") + " ";
                        rs += p + b1.ToString("X2") + " ";
                        rs += p + b2.ToString("X2") + " ";
                        rs += p + b3.ToString("X2");
                    }
                    else if (nBytes == 8)
                    {
                        rs += p + b0.ToString("X2") + " ";
                        rs += p + b1.ToString("X2") + " ";
                        rs += p + b2.ToString("X2") + " ";
                        rs += p + b3.ToString("X2") + " ";
                        rs += p + b4.ToString("X2") + " ";
                        rs += p + b5.ToString("X2") + " ";
                        rs += p + b6.ToString("X2") + " ";
                        rs += p + b7.ToString("X2");
                    }
                }
            }
            catch (Exception e )
            {
                Console.WriteLine("Error: invalid number/Frequency Expected positive value like: 123;  1,234; 50k; 100.25K; 88m; 0.1Mhz; 3Ghz;  etc " + e.Message.ToString());
            }
            return rs;
        }

    }
}
